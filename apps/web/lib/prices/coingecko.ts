import { TokenPrice } from "./types";

// ─── Platform mapping ──────────────────────────────────────────────
// CoinGecko uses platform IDs — we only support Base for now.

const CHAIN_TO_PLATFORM: Record<number, string> = {
  8453: "base",
  84532: "base", // Base Sepolia → use Base mainnet prices as best-effort
};

// ─── In-memory TTL cache ───────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: Record<string, TokenPrice>;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): Record<string, TokenPrice> | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: Record<string, TokenPrice>): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── CoinGecko helpers ─────────────────────────────────────────────

const BASE_URL = "https://api.coingecko.com/api/v3";

function headers(): HeadersInit {
  const h: HeadersInit = { Accept: "application/json" };
  const key = process.env.COINGECKO_API_KEY;
  if (key) {
    h["x-cg-demo-api-key"] = key;
  }
  return h;
}

/** Fetch ETH/USD price from CoinGecko. */
async function fetchEthPrice(): Promise<TokenPrice> {
  const cached = getCached("eth");
  if (cached && cached["eth"]) return cached["eth"];

  const url = `${BASE_URL}/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(`CoinGecko ETH price request failed: ${res.status}`);
  }

  const data = await res.json();
  const price: TokenPrice = {
    usd: data.ethereum?.usd ?? 0,
    usd_24h_change: data.ethereum?.usd_24h_change ?? 0,
  };

  setCache("eth", { eth: price });
  return price;
}

/** Fetch token prices by contract address for a given chain. */
async function fetchTokenPrices(
  tokenAddresses: string[],
  chainId: number
): Promise<Record<string, TokenPrice>> {
  const platform = CHAIN_TO_PLATFORM[chainId];
  if (!platform || tokenAddresses.length === 0) return {};

  // Normalise addresses to lowercase for CoinGecko
  const normalised = tokenAddresses.map((a) => a.toLowerCase());
  const cacheKey = `tokens:${platform}:${normalised.sort().join(",")}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/simple/token_price/${platform}?contract_addresses=${normalised.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(`CoinGecko token price request failed: ${res.status}`);
  }

  const data = await res.json();

  const result: Record<string, TokenPrice> = {};
  for (const addr of normalised) {
    if (data[addr]) {
      result[addr] = {
        usd: data[addr].usd ?? 0,
        usd_24h_change: data[addr].usd_24h_change ?? 0,
      };
    }
  }

  setCache(cacheKey, result);
  return result;
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Fetch USD prices for a list of token addresses + optionally ETH.
 * Returns a map keyed by lowercase address. ETH is keyed as "eth".
 */
export async function getTokenPrices(
  tokenAddresses: string[],
  chainId: number,
  includeEth = true
): Promise<Record<string, TokenPrice>> {
  const results: Record<string, TokenPrice> = {};

  const promises: Promise<void>[] = [];

  if (includeEth) {
    promises.push(
      fetchEthPrice()
        .then((p) => { results["eth"] = p; })
        .catch(() => { /* ETH price unavailable — skip gracefully */ })
    );
  }

  if (tokenAddresses.length > 0) {
    promises.push(
      fetchTokenPrices(tokenAddresses, chainId)
        .then((prices) => { Object.assign(results, prices); })
        .catch(() => { /* Token prices unavailable — skip gracefully */ })
    );
  }

  await Promise.all(promises);
  return results;
}
