import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const anvil = defineChain({
  id: 1337,
  name: "Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
});

function getChain() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532");
  return chainId === 1337 ? anvil : baseSepolia;
}

export function getPublicClient() {
  return createPublicClient({
    chain: getChain(),
    transport: http(process.env.BASE_RPC_URL),
  });
}

export function getWalletClient() {
  const privateKey = process.env.EXECUTOR_PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    account,
    chain: getChain(),
    transport: http(process.env.BASE_RPC_URL),
  });
}
