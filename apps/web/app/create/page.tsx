"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount, usePublicClient } from "wagmi";
import { isAddress, formatUnits } from "viem";
import { WalletGuard } from "@/components/wallet/wallet-guard";
import { Brand } from "@/components/landing/brand";
import { useTokenApproval } from "@/hooks/use-token-approval";
import { useCreateWill } from "@/hooks/use-create-will";
import { useWalletTokens } from "@/hooks/use-wallet-tokens";
import { useEnsAddress } from "@/hooks/use-ens-address";
import { NFTSelector, type SelectedNFT } from "@/components/create/nft-selector";
import { Shield, Mail, Check, ArrowRight, Info, Loader2 } from "lucide-react";
import { useTokenPrices } from "@/hooks/use-token-prices";
import { formatUSD } from "@/lib/format";

// ─── Constants ──────────────────────────────────────────────────────

const STEPS = [
  { id: "details", n: "01", t: "Details" },
  { id: "tokens", n: "02", t: "Tokens, NFTs & approvals" },
  { id: "review", n: "03", t: "Review & create" },
];

const GRACE_OPTIONS = [
  { value: 30, label: "30 days", hint: "Aggressive — for active users" },
  { value: 60, label: "60 days", hint: "" },
  { value: 90, label: "90 days", hint: "Recommended" },
  { value: 120, label: "120 days", hint: "" },
  { value: 180, label: "180 days", hint: "For long-term holders" },
];

// ─── Token Approval Row ─────────────────────────────────────────────

function TokenApprovalRow({
  tokenAddress,
  symbol,
  balance,
  zeroBalanceWarning,
  onRemove,
  onApprovalChange,
  usdValue,
}: {
  tokenAddress: `0x${string}`;
  symbol?: string;
  balance?: string;
  zeroBalanceWarning?: boolean;
  onRemove: () => void;
  onApprovalChange: (addr: string, approved: boolean) => void;
  usdValue?: number | null;
}) {
  const { isApproved, approve, isPending, error } = useTokenApproval(tokenAddress);

  useEffect(() => {
    onApprovalChange(tokenAddress, isApproved);
  }, [tokenAddress, isApproved, onApprovalChange]);

  return (
    <div className="px-5 py-4 border-b border-line-2" style={{ background: isApproved ? "rgba(185,79,43,0.04)" : "transparent" }}>
      <div
        className="grid items-center gap-4"
        style={{ gridTemplateColumns: "1fr 130px 130px" }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-[10px] bg-ink/10 flex items-center justify-center text-xs font-bold">
            {(symbol || "?")[0]}
          </div>
          <div>
            <div className="text-[15px] font-medium">
              {symbol || "Unknown"}{" "}
              {zeroBalanceWarning && (
                <span className="text-warn text-xs font-normal">· no balance</span>
              )}
            </div>
            <div className="mono text-[11px] text-ink-3 mt-0.5">
              {tokenAddress.slice(0, 8)}…{tokenAddress.slice(-6)}
            </div>
          </div>
        </div>
        <div>
          {balance && (
            <>
              <div className="mono text-sm">
                {Number(balance).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </div>
              {usdValue != null && usdValue > 0 && (
                <div className="mono text-[11px] text-ink-3 mt-0.5">
                  {formatUSD(usdValue)}
                </div>
              )}
              {zeroBalanceWarning && (
                <div className="text-xs text-warn">no balance</div>
              )}
            </>
          )}
        </div>
        <div className="text-right flex items-center justify-end gap-2">
          {isApproved ? (
            <span className="text-xs text-good inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Approved
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); approve(); }}
              disabled={isPending}
              className="rounded-pill bg-ink text-paper px-3.5 py-2 text-[13px] font-medium cursor-pointer border-none disabled:opacity-50"
            >
              {isPending ? "Confirm…" : "Approve"}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="bg-transparent border-none text-ink-3 cursor-pointer text-sm hover:text-ink"
          >
            ×
          </button>
        </div>
      </div>
      {error && (
        <div className="text-xs text-danger mt-2">
          Error: {error.message.slice(0, 200)}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function CreateWillPage() {
  const router = useRouter();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [beneficiary, setBeneficiary] = useState("");
  const [beneficiaryEmail, setBeneficiaryEmail] = useState("");
  const [email, setEmail] = useState("");
  const [gracePeriod, setGracePeriod] = useState(90);

  // ENS resolution — detect .eth input and resolve to address
  const isEnsInput = beneficiary.endsWith(".eth") && beneficiary.length > 4;
  const { ensAddress, isLoading: ensLoading } = useEnsAddress(
    isEnsInput ? beneficiary : undefined
  );
  // Use resolved ENS address when available, otherwise use raw input
  const resolvedBeneficiary = isEnsInput && ensAddress ? ensAddress : beneficiary;

  // Step 2 state
  const [tokenInput, setTokenInput] = useState("");
  const [tokens, setTokens] = useState<`0x${string}`[]>([]);
  const [tokenMeta, setTokenMeta] = useState<
    Record<string, { symbol: string; balance: string }>
  >({});
  const [zeroBalanceTokens, setZeroBalanceTokens] = useState<Set<string>>(
    new Set()
  );
  const [approvedSet, setApprovedSet] = useState<Set<string>>(new Set());
  const { tokens: detectedTokens, isLoading: tokensLoading } =
    useWalletTokens();
  // Gather all token addresses (detected + manually added) for price lookup
  const allTokenAddresses = [
    ...detectedTokens.map((t) => t.address),
    ...tokens,
  ].filter((a, i, arr) => arr.indexOf(a) === i);
  const { prices } = useTokenPrices(allTokenAddresses);

  // NFT state
  const [selectedNFTs, setSelectedNFTs] = useState<SelectedNFT[]>([]);
  const [nftApprovedSet, setNftApprovedSet] = useState<Set<string>>(new Set());

  // All token approvals must pass, and all NFT contract approvals must pass
  const allTokensApproved =
    tokens.length > 0 && tokens.every((t) => approvedSet.has(t));
  const hasAssets = tokens.length > 0 || selectedNFTs.length > 0;

  // Get unique NFT contract addresses that need approval
  const nftContractAddrs = Array.from(
    new Set(selectedNFTs.map((n) => n.contractAddress.toLowerCase()))
  );
  const allNftApproved =
    selectedNFTs.length === 0 ||
    nftContractAddrs.every((addr) => nftApprovedSet.has(addr));

  const allApproved =
    hasAssets &&
    (tokens.length === 0 || allTokensApproved) &&
    allNftApproved;

  const handleApprovalChange = useCallback(
    (addr: string, approved: boolean) => {
      setApprovedSet((prev) => {
        const next = new Set(prev);
        if (approved) next.add(addr);
        else next.delete(addr);
        return next;
      });
    },
    []
  );

  const handleNftApprovalChange = useCallback(
    (addr: string, approved: boolean) => {
      setNftApprovedSet((prev) => {
        const next = new Set(prev);
        if (approved) next.add(addr.toLowerCase());
        else next.delete(addr.toLowerCase());
        return next;
      });
    },
    []
  );

  // Step 3
  const { createWill, createWillWithNFTs, isPending, isSuccess, hash, error, willId: contractWillId } = useCreateWill();
  const [dbSaving, setDbSaving] = useState(false);
  const dbSaveAttempted = useRef(false);

  useEffect(() => {
    if (!isSuccess || !hash || !address || dbSaveAttempted.current) return;
    dbSaveAttempted.current = true;
    setDbSaving(true);

    fetch("/api/will", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wallet-address": address,
      },
      body: JSON.stringify({
        beneficiaryAddress: resolvedBeneficiary,
        tokenAddresses: tokens,
        gracePeriodDays: gracePeriod,
        contractTxHash: hash,
        email: email || undefined,
        beneficiaryEmail: beneficiaryEmail || undefined,
        contractWillId: contractWillId !== undefined ? Number(contractWillId) : undefined,
        contractVersion: 2,
        nfts: selectedNFTs.map((n) => ({
          contractAddress: n.contractAddress,
          tokenId: n.tokenId,
          amount: String(n.amount),
          nftType: n.nftType,
          name: n.name,
          imageUrl: n.imageUrl,
        })),
      }),
    })
      .catch(() => {})
      .finally(() => {
        setDbSaving(false);
        router.push("/dashboard");
      });
  }, [isSuccess, hash, address, resolvedBeneficiary, tokens, gracePeriod, email, beneficiaryEmail, router, contractWillId, selectedNFTs]);

  const fetchTokenMeta = async (tokenAddr: `0x${string}`) => {
    if (!publicClient || !address) return;
    try {
      const [symbol, decimals, balance] = await Promise.all([
        publicClient.readContract({
          address: tokenAddr,
          abi: [{ type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" }] as const,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: tokenAddr,
          abi: [{ type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" }] as const,
          functionName: "decimals",
        }),
        publicClient.readContract({
          address: tokenAddr,
          abi: [{ type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" }] as const,
          functionName: "balanceOf",
          args: [address],
        }),
      ]);
      const formatted = formatUnits(balance, decimals);
      setTokenMeta((prev) => ({ ...prev, [tokenAddr]: { symbol, balance: formatted } }));
      if (balance === BigInt(0)) {
        setZeroBalanceTokens((prev) => new Set(prev).add(tokenAddr));
      } else {
        setZeroBalanceTokens((prev) => {
          const next = new Set(prev);
          next.delete(tokenAddr);
          return next;
        });
      }
    } catch {
      // Contract doesn't support ERC-20 interface
      setZeroBalanceTokens((prev) => new Set(prev).add(tokenAddr));
    }
  };

  const addToken = (
    addr?: `0x${string}`,
    meta?: { symbol: string; balance: string }
  ) => {
    const tokenAddr = addr || (tokenInput as `0x${string}`);
    if (!isAddress(tokenAddr) || tokens.includes(tokenAddr)) return;
    setTokens((prev) => [...prev, tokenAddr]);
    if (meta) {
      setTokenMeta((prev) => ({ ...prev, [tokenAddr]: meta }));
    } else {
      const detected = detectedTokens.find(
        (t) => t.address.toLowerCase() === tokenAddr.toLowerCase()
      );
      if (detected) {
        setTokenMeta((prev) => ({
          ...prev,
          [tokenAddr]: { symbol: detected.symbol, balance: detected.balance },
        }));
      } else {
        // Fetch symbol + balance from chain
        fetchTokenMeta(tokenAddr);
      }
    }
    setTokenInput("");
  };

  const removeToken = (index: number) => {
    const removed = tokens[index];
    setTokens((prev) => prev.filter((_, i) => i !== index));
    setZeroBalanceTokens((prev) => {
      const next = new Set(prev);
      next.delete(removed);
      return next;
    });
    setApprovedSet((prev) => {
      const next = new Set(prev);
      next.delete(removed);
      return next;
    });
  };

  const handleCreate = () => {
    const gracePeriodSeconds = BigInt(gracePeriod * 24 * 60 * 60);
    if (selectedNFTs.length > 0) {
      const nftItems = selectedNFTs.map((n) => ({
        contractAddr: n.contractAddress as `0x${string}`,
        tokenId: BigInt(n.tokenId),
        amount: BigInt(n.amount),
        nftType: n.nftType === "erc721" ? 0 : 1,
      }));
      createWillWithNFTs(
        resolvedBeneficiary as `0x${string}`,
        tokens,
        nftItems,
        gracePeriodSeconds
      );
    } else {
      createWill(resolvedBeneficiary as `0x${string}`, tokens, gracePeriodSeconds);
    }
  };

  // Validation — use resolved address (from ENS or raw input)
  const validAddr =
    isAddress(resolvedBeneficiary) &&
    resolvedBeneficiary.toLowerCase() !== address?.toLowerCase();
  const validEmail = /\S+@\S+\.\S+/.test(email);
  const validBeneficiaryEmail = !beneficiaryEmail || /\S+@\S+\.\S+/.test(beneficiaryEmail);
  const step1Ok = validAddr && validEmail && validBeneficiaryEmail;

  const short = (a: string) =>
    a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";

  return (
    <WalletGuard>
      <div
        className="min-h-screen grid bg-bg"
        style={{ gridTemplateColumns: "320px 1fr" }}
      >
        {/* ─── Left Rail Stepper ─── */}
        <aside className="border-r border-line-2 px-7 py-8 bg-bg-2 sticky top-0 h-screen flex flex-col">
          <div className="mb-14">
            <Brand size={20} />
          </div>
          <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3 mb-4">
            Create your will
          </div>
          <ol className="list-none m-0 p-0 grid gap-1">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => i <= step && setStep(i)}
                    disabled={i > step}
                    className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-[10px] text-left border cursor-pointer disabled:cursor-default ${
                      active
                        ? "bg-paper border-line"
                        : "bg-transparent border-transparent"
                    }`}
                  >
                    <span
                      className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] mono font-medium border ${
                        done
                          ? "bg-accent border-accent text-accent-ink"
                          : active
                          ? "bg-transparent border-ink text-ink"
                          : "bg-transparent border-line text-ink-3"
                      }`}
                    >
                      {done ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        s.n
                      )}
                    </span>
                    <span
                      className={`text-sm ${
                        active || done
                          ? "text-ink font-medium"
                          : "text-ink-3"
                      }`}
                    >
                      {s.t}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-auto pt-6 border-t border-line text-xs text-ink-3 leading-relaxed">
            <div className="flex items-center gap-2 text-ink-2 font-medium mb-1.5">
              <Shield className="w-4 h-4" /> You&apos;re in control
            </div>
            One on-chain tx at the end. You can quit any time.
          </div>
        </aside>

        {/* ─── Main Content ─── */}
        <main className="px-12 py-14 max-w-[980px] w-full lg:px-20">
          {/* Step 1: Details */}
          {step === 0 && (
            <div>
              <StepHeader
                kicker="Step 01"
                title="Who, where, and how long."
                sub="Pick a beneficiary, give us an email for monthly reminders, and set the grace period before your will can execute."
              />
              <div className="grid grid-cols-1 gap-8 items-start lg:grid-cols-[1fr_340px]">
                <div className="grid gap-5 max-w-[620px]">
                  <FieldBox
                    label="Beneficiary wallet address"
                    hint="0x… or ENS · single recipient"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        value={beneficiary}
                        onChange={(e) => setBeneficiary(e.target.value)}
                        placeholder="0x7B0e…41a8 or alex.eth"
                        className="border-none outline-none bg-transparent w-full font-inherit text-[15px]"
                      />
                      {isEnsInput && ensLoading && (
                        <Loader2 className="w-4 h-4 text-ink-3 animate-spin shrink-0" />
                      )}
                      {isEnsInput && ensAddress && (
                        <Check className="w-4 h-4 text-good shrink-0" />
                      )}
                    </div>
                  </FieldBox>
                  {isEnsInput && ensAddress && (
                    <div className="text-[13px] text-good -mt-3 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      Resolved to <span className="mono text-xs">{ensAddress.slice(0, 6)}…{ensAddress.slice(-4)}</span>
                    </div>
                  )}
                  {isEnsInput && !ensLoading && !ensAddress && (
                    <div className="text-[13px] text-danger -mt-3">
                      ENS name not found.
                    </div>
                  )}
                  {!isEnsInput && beneficiary && !isAddress(beneficiary) && (
                    <div className="text-[13px] text-danger -mt-3">
                      Invalid address.
                    </div>
                  )}
                  {beneficiary &&
                    isAddress(resolvedBeneficiary) &&
                    resolvedBeneficiary.toLowerCase() === address?.toLowerCase() && (
                      <div className="text-[13px] text-danger -mt-3">
                        Can&apos;t be your own address.
                      </div>
                    )}

                  <FieldBox
                    label="Beneficiary email"
                    hint="Optional — we'll notify them when your will executes"
                  >
                    <input
                      value={beneficiaryEmail}
                      onChange={(e) => setBeneficiaryEmail(e.target.value)}
                      type="email"
                      placeholder="beneficiary@somewhere.com"
                      className="border-none outline-none bg-transparent w-full font-inherit text-[15px]"
                    />
                  </FieldBox>
                  {beneficiaryEmail && !/\S+@\S+\.\S+/.test(beneficiaryEmail) && (
                    <div className="text-[13px] text-danger -mt-3">
                      Invalid email address.
                    </div>
                  )}

                  <FieldBox
                    label="Email for monthly reminders"
                    hint="Required · only used to send your check-in"
                  >
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="you@somewhere.com"
                      className="border-none outline-none bg-transparent w-full font-inherit text-[15px]"
                    />
                  </FieldBox>

                  <div>
                    <div className="text-[13px] text-ink-2 font-medium mb-2.5">
                      Grace period
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {GRACE_OPTIONS.map((o) => {
                        const active = gracePeriod === o.value;
                        return (
                          <button
                            key={o.value}
                            onClick={() => setGracePeriod(o.value)}
                            className={`px-2.5 py-3.5 rounded-inputs border cursor-pointer text-center ${
                              active
                                ? "bg-ink text-paper border-ink"
                                : "bg-paper text-ink border-line"
                            }`}
                          >
                            <div className="text-sm font-medium">
                              {o.label}
                            </div>
                            {o.hint && (
                              <div
                                className={`text-[10px] mt-1 ${
                                  active ? "text-white/60" : "text-ink-3"
                                }`}
                              >
                                {o.hint}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-xs text-ink-3 mt-2.5">
                      If you stop checking in, anyone can execute your will
                      after {gracePeriod} days of silence.
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <aside className="sticky top-6 p-6 rounded-cards bg-bg-2 border border-line hidden lg:block">
                  <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3 mb-3">
                    What happens next
                  </div>
                  <ol className="m-0 pl-4 text-[13px] text-ink-2 leading-relaxed space-y-1">
                    <li>You sign one wallet message to authorize ChainWill (no gas).</li>
                    <li>We email you on the 1st of every month.</li>
                    <li>
                      If you go silent for {gracePeriod} days, anyone can call{" "}
                      <code className="mono text-xs">executeWill()</code>.
                    </li>
                    <li>Your tokens transfer directly to your beneficiary.</li>
                  </ol>
                  <div className="mt-4 pt-4 border-t border-line text-xs text-ink-3 leading-relaxed">
                    <div className="flex items-center gap-2 text-ink font-medium mb-1.5">
                      <Mail className="w-4 h-4" /> Sealed letter
                    </div>
                    After creating your will, you can leave an encrypted note
                    from the dashboard. Only your beneficiary can read it — with
                    a password you share out-of-band.
                  </div>
                </aside>
              </div>
              <NavBar
                back={null}
                next={() => setStep(1)}
                nextDisabled={!step1Ok}
              />
            </div>
          )}

          {/* Step 2: Tokens & approvals */}
          {step === 1 && (
            <div>
              <StepHeader
                kicker="Step 02"
                title="Pick tokens. Approve each one."
                sub="We detected ERC-20 balances in your wallet via Alchemy. Tap to add, then approve each so the contract can transfer them later. Approvals don't lock your funds — you can spend or revoke any time."
              />
              <div className="grid grid-cols-1 gap-8 items-start lg:grid-cols-[1fr_320px]">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-[13px] text-ink-2 font-medium">
                      Detected in your wallet
                    </div>
                    <div className="text-xs text-ink-3">
                      via alchemy_getTokenBalances
                    </div>
                  </div>

                  {tokensLoading && (
                    <div className="text-sm text-ink-3 text-center py-8">
                      Detecting tokens in your wallet...
                    </div>
                  )}

                  <div className="bg-paper border border-line rounded-cards overflow-hidden">
                    {!tokensLoading &&
                      detectedTokens
                        .filter((t) => !tokens.includes(t.address))
                        .map((t) => {
                          const price = prices?.[t.address.toLowerCase()];
                          const usdValue = price ? price.usd * Number(t.balance) : null;
                          return (
                            <div
                              key={t.address}
                              className="grid items-center gap-4 px-5 py-4 border-b border-line-2 cursor-pointer hover:bg-accent-soft/30 transition-colors"
                              style={{
                                gridTemplateColumns: "1fr 130px 130px",
                              }}
                              onClick={() =>
                                addToken(t.address, {
                                  symbol: t.symbol,
                                  balance: t.balance,
                                })
                              }
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-9 h-9 rounded-[10px] bg-ink/10 flex items-center justify-center text-xs font-bold">
                                  {t.symbol[0]}
                                </div>
                                <div>
                                  <div className="text-[15px] font-medium">
                                    {t.symbol}
                                  </div>
                                  <div className="mono text-[11px] text-ink-3 mt-0.5">
                                    {t.address.slice(0, 8)}…
                                    {t.address.slice(-6)}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <div className="mono text-sm">
                                  {Number(t.balance).toLocaleString(undefined, {
                                    maximumFractionDigits: 4,
                                  })}
                                </div>
                                {usdValue !== null && (
                                  <div className="mono text-[11px] text-ink-3 mt-0.5">
                                    {formatUSD(usdValue)}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToken(t.address, {
                                      symbol: t.symbol,
                                      balance: t.balance,
                                    });
                                  }}
                                  className="bg-transparent border border-ink text-ink px-3.5 py-1.5 rounded-pill cursor-pointer text-[13px]"
                                >
                                  + Add
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    {tokens.map((token, i) => {
                      const price = prices?.[token.toLowerCase()];
                      const bal = tokenMeta[token]?.balance;
                      const usd = price && bal ? price.usd * Number(bal) : null;
                      return (
                        <TokenApprovalRow
                          key={token}
                          tokenAddress={token}
                          symbol={tokenMeta[token]?.symbol}
                          balance={bal}
                          zeroBalanceWarning={zeroBalanceTokens.has(token)}
                          onRemove={() => removeToken(i)}
                          onApprovalChange={handleApprovalChange}
                          usdValue={usd}
                        />
                      );
                    })}
                    {!tokensLoading &&
                      detectedTokens.filter(
                        (t) => !tokens.includes(t.address)
                      ).length === 0 &&
                      tokens.length === 0 && (
                        <div className="text-sm text-ink-3 text-center py-8">
                          No tokens detected. Add token addresses manually
                          below.
                        </div>
                      )}
                  </div>

                  <div className="mt-6 p-4 rounded-inputs bg-bg-2 border border-dashed border-line">
                    <div className="text-[13px] text-ink-2 font-medium mb-2.5">
                      Or add a token by address
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="0x… contract address"
                        className="flex-1 px-3 py-2.5 rounded-[10px] border border-line bg-paper text-[15px] outline-none"
                      />
                      <button
                        onClick={() => addToken()}
                        disabled={!isAddress(tokenInput)}
                        className="rounded-pill border border-ink text-ink px-4 py-2 text-[13px] cursor-pointer bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* ─── NFT Selection ─── */}
                  <div className="mt-8 pt-8 border-t border-line">
                    <div className="text-[13px] text-ink-2 font-medium mb-1">
                      NFTs (optional)
                    </div>
                    <p className="text-xs text-ink-3 mb-4">
                      Select ERC-721 and ERC-1155 NFTs to include in your will.
                      Each NFT contract needs a one-time setApprovalForAll.
                    </p>
                    <NFTSelector
                      selectedNFTs={selectedNFTs}
                      onSelectionChange={setSelectedNFTs}
                      onApprovalChange={handleNftApprovalChange}
                    />
                  </div>
                </div>

                {/* Sidebar */}
                <aside className="sticky top-6 p-6 rounded-cards bg-bg-2 border border-line hidden lg:block">
                  <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3">
                    Approval status
                  </div>
                  <div className="serif text-4xl leading-none mt-1.5">
                    {Math.min(approvedSet.size, tokens.length)}
                    <span className="text-ink-3">/{tokens.length || 0}</span>
                    {selectedNFTs.length > 0 && (
                      <span className="text-ink-3 text-lg ml-2">
                        + {selectedNFTs.length} NFT{selectedNFTs.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-ink-3 mt-1">
                    {!hasAssets
                      ? "Pick at least one token or NFT"
                      : allApproved
                      ? "All set — continue"
                      : "Approve all assets before continuing"}
                  </div>
                  <div className="mt-4 pt-4 border-t border-line text-xs text-ink-2 leading-relaxed">
                    <div className="flex items-center gap-2 text-ink font-medium mb-1.5">
                      <Info className="w-4 h-4" /> About ETH
                    </div>
                    ETH in your wallet isn&apos;t covered. To include ETH,
                    deposit it into the contract from the dashboard after
                    creating your will.
                  </div>
                </aside>
              </div>
              <NavBar
                back={() => setStep(0)}
                next={() => setStep(2)}
                nextDisabled={!allApproved}
                nextLabel={
                  !allApproved && hasAssets
                    ? `Approve all assets (${Math.min(
                        approvedSet.size,
                        tokens.length
                      )}/${tokens.length} tokens${
                        selectedNFTs.length > 0
                          ? `, ${selectedNFTs.length} NFTs`
                          : ""
                      })`
                    : "Continue"
                }
              />
            </div>
          )}

          {/* Step 3: Review & create */}
          {step === 2 && (
            <div>
              <StepHeader
                kicker="Step 03"
                title="One signature. Then it's live."
                sub={`This calls createWill() on the contract — beneficiary, token list, and ${gracePeriod}-day grace period in a single transaction.`}
              />
              <div className="bg-paper border border-line rounded-cards-lg p-9 max-w-[820px]">
                <div className="mono text-[11px] text-ink-3 tracking-[0.14em]">
                  CHAINWILL · INSTRUMENT · BASE
                </div>
                <h2 className="serif text-4xl leading-[1.1] mt-3 mb-7">
                  The will of{" "}
                  <span className="text-accent">{short(address || "")}</span>
                </h2>
                <ReviewRow k="Owner" v={<span className="mono">{address}</span>} />
                <ReviewRow
                  k="Beneficiary"
                  v={
                    <span className="mono">
                      {resolvedBeneficiary}
                      {isEnsInput && ensAddress && (
                        <span className="text-ink-3 text-xs ml-2 not-italic">
                          ({beneficiary})
                        </span>
                      )}
                    </span>
                  }
                />
                <ReviewRow
                  k="Tokens"
                  v={
                    <div className="grid gap-2">
                      {tokens.map((t) => (
                        <div key={t} className="flex items-center gap-2.5">
                          <span className="text-sm">
                            {tokenMeta[t]?.balance
                              ? Number(tokenMeta[t].balance).toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 4 }
                                )
                              : "?"}{" "}
                            {tokenMeta[t]?.symbol || short(t)}
                          </span>
                          <span className="text-xs text-good">· approved</span>
                          {zeroBalanceTokens.has(t) && (
                            <span className="text-xs text-warn">
                              · no balance
                            </span>
                          )}
                        </div>
                      ))}
                      <div className="text-xs text-ink-3 mt-1">
                        ETH covered separately via dashboard deposit
                      </div>
                    </div>
                  }
                />
                {selectedNFTs.length > 0 && (
                  <ReviewRow
                    k="NFTs"
                    v={
                      <div className="grid gap-2">
                        {selectedNFTs.map((n) => (
                          <div
                            key={`${n.contractAddress}-${n.tokenId}`}
                            className="flex items-center gap-2.5"
                          >
                            <span className="text-sm">
                              {n.name}{" "}
                              <span className="text-ink-3 text-xs">
                                ({n.nftType === "erc721"
                                  ? "ERC-721"
                                  : `ERC-1155 x${n.amount}`})
                              </span>
                            </span>
                            <span className="text-xs text-good">
                              · approved
                            </span>
                          </div>
                        ))}
                      </div>
                    }
                  />
                )}
                <ReviewRow
                  k="Grace period"
                  v={`${gracePeriod} days of silence triggers eligibility`}
                />
                <ReviewRow
                  k="Email"
                  v={<span>{email}</span>}
                  last={!beneficiaryEmail}
                />
                {beneficiaryEmail && (
                  <ReviewRow
                    k="Beneficiary email"
                    v={<span>{beneficiaryEmail}</span>}
                    last
                  />
                )}

                <div className="mt-6 p-4 rounded-inputs bg-bg-2 border border-dashed border-line text-[13px] text-ink-2 leading-relaxed">
                  <b className="text-ink">Estimated gas:</b> ~$0.04 on Base.
                  One transaction registers your beneficiary, token list, and
                  grace period.
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-inputs border border-danger p-3">
                  <p className="text-sm text-danger">
                    Transaction failed: {error.message.slice(0, 100)}
                  </p>
                </div>
              )}

              <NavBar
                back={() => setStep(1)}
                next={handleCreate}
                nextLabel={
                  dbSaving
                    ? "Saving..."
                    : isPending
                    ? "Confirming on Base…"
                    : "Sign & create will"
                }
                nextDisabled={isPending || dbSaving}
              />
            </div>
          )}
        </main>
      </div>
    </WalletGuard>
  );
}

// ─── Shared Sub-components ──────────────────────────────────────────

function StepHeader({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-10">
      <div className="text-xs tracking-[0.14em] uppercase text-accent mb-3.5">
        {kicker}
      </div>
      <h1 className="serif text-[56px] leading-[1.02] m-0 tracking-[-0.02em] max-w-[720px]">
        {title}
      </h1>
      {sub && (
        <p className="text-[17px] leading-relaxed text-ink-2 mt-4 max-w-[600px]">
          {sub}
        </p>
      )}
    </div>
  );
}

function FieldBox({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[13px] text-ink-2 font-medium">{label}</span>
        {hint && <span className="text-xs text-ink-3">{hint}</span>}
      </div>
      <div className="bg-paper border border-line rounded-inputs px-3.5 py-3">
        {children}
      </div>
    </label>
  );
}

function ReviewRow({
  k,
  v,
  last,
}: {
  k: string;
  v: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`grid gap-6 py-4 ${last ? "" : "border-b border-line"}`}
      style={{ gridTemplateColumns: "180px 1fr" }}
    >
      <div className="text-[13px] text-ink-3 tracking-[0.05em] uppercase">
        {k}
      </div>
      <div className="text-[15px] text-ink">{v}</div>
    </div>
  );
}

function NavBar({
  back,
  next,
  nextLabel,
  nextDisabled,
}: {
  back: (() => void) | null;
  next: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-14 flex justify-between items-center max-w-[980px]">
      {back ? (
        <button
          onClick={back}
          className="bg-transparent border-none text-ink-2 cursor-pointer text-[15px] font-medium hover:text-ink"
        >
          ← Back
        </button>
      ) : (
        <span />
      )}
      <button
        onClick={nextDisabled ? undefined : next}
        disabled={nextDisabled}
        className="inline-flex items-center gap-2.5 rounded-pill bg-ink text-paper px-5 py-3.5 text-[15px] font-medium cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {nextLabel || "Continue"} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
