"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { isAddress } from "viem";
import { WalletGuard } from "@/components/wallet/wallet-guard";
import { DashHeader } from "@/components/dashboard/dash-header";
import { CheckinCard } from "@/components/dashboard/checkin-card";
import { GraceBanner } from "@/components/dashboard/grace-banner";
import { AssetsCard } from "@/components/dashboard/assets-card";
import { BeneficiaryCard } from "@/components/dashboard/beneficiary-card";
import { ETHDepositCard } from "@/components/dashboard/eth-deposit-card";
import { ActivityList } from "@/components/dashboard/activity-list";
import { NFTsCard } from "@/components/dashboard/nfts-card";
import { TrustStrip } from "@/components/dashboard/trust-strip";
import { WillSelector } from "@/components/dashboard/will-selector";
import {
  useWill,
  useSignAlive,
  useRevokeWill,
  useUpdateTokens,
  useEthBalance,
  useDepositETH,
  useUpdateBeneficiary,
} from "@/hooks/use-will";
import { useTokenPrices } from "@/hooks/use-token-prices";
import { useWalletTokens } from "@/hooks/use-wallet-tokens";

function formatTimestamp(timestamp: bigint): string {
  if (!timestamp || timestamp === BigInt(0)) return "Never";
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const { address } = useAccount();
  const { will, hasWill, isLoading, refetch } = useWill();
  const {
    signAlive,
    isPending: isSigningAlive,
    isSuccess: aliveSuccess,
    hash: aliveHash,
  } = useSignAlive();
  const {
    revokeWill,
    isPending: isRevoking,
    isSuccess: revokeSuccess,
    error: revokeError,
  } = useRevokeWill();
  const {
    updateTokens,
    isPending: isUpdatingTokens,
    isSuccess: updateSuccess,
    error: updateError,
  } = useUpdateTokens();
  const { balance: depositedETH, refetch: refetchETH } = useEthBalance();
  const {
    depositETH,
    isPending: isDepositing,
    isSuccess: depositSuccess,
    error: depositError,
  } = useDepositETH();
  const {
    updateBeneficiary,
    isPending: isUpdatingBeneficiary,
    isSuccess: beneficiarySuccess,
    error: beneficiaryError,
  } = useUpdateBeneficiary();

  // DB will ID — needed for sealed letter and other DB-backed features
  const [dbWillId, setDbWillId] = useState<string | null>(null);
  useEffect(() => {
    if (!address) return;
    fetch("/api/will", { headers: { "x-wallet-address": address } })
      .then((r) => r.json())
      .then((data) => {
        const id = data?.wills?.[0]?.id;
        if (id) setDbWillId(id);
      })
      .catch(() => {});
  }, [address]);

  // Token prices and balances for USD display
  const { tokens: walletTokens } = useWalletTokens();
  const { prices } = useTokenPrices(
    will?.tokens ? [...will.tokens] : []
  );
  const tokenBalances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of walletTokens) {
      map[t.address.toLowerCase()] = Number(t.balance);
    }
    return map;
  }, [walletTokens]);

  const aliveSynced = useRef(false);
  const updateSynced = useRef(false);
  const revokeSynced = useRef(false);
  const beneficiarySynced = useRef(false);
  const revokeClicked = useRef(false);

  // DB will state (for beneficiary_email)
  const [dbWill, setDbWill] = useState<{ id: string; beneficiary_email: string | null } | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);

  // Fetch DB will to get beneficiary_email
  useEffect(() => {
    if (!address) return;
    fetch("/api/will", { headers: { "x-wallet-address": address } })
      .then((r) => r.json())
      .then((data) => {
        const w = data?.wills?.[0];
        if (w) setDbWill({ id: w.id, beneficiary_email: w.beneficiary_email ?? null });
      })
      .catch(() => {});
  }, [address]);

  const handleUpdateBeneficiaryEmail = (email: string | null) => {
    if (!dbWill) return;
    setEmailSaving(true);
    setEmailSaved(false);
    fetch(`/api/will/${dbWill.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-wallet-address": address || "",
      },
      body: JSON.stringify({ beneficiaryEmail: email }),
    })
      .then((r) => {
        if (r.ok) {
          setDbWill((prev) => prev ? { ...prev, beneficiary_email: email } : prev);
          setEmailSaved(true);
        }
      })
      .catch(() => {})
      .finally(() => setEmailSaving(false));
  };

  // Token management state
  const [localTokens, setLocalTokens] = useState<string[]>([]);
  const [tokensDirty, setTokensDirty] = useState(false);

  // Revoke confirmation state
  const [revokeConfirm, setRevokeConfirm] = useState(false);

  // Sync local token list when will loads
  useEffect(() => {
    if (will?.tokens) {
      setLocalTokens([...will.tokens]);
      setTokensDirty(false);
    }
  }, [will?.tokens]);

  // After updateTokens confirms, refetch will
  useEffect(() => {
    if (!updateSuccess || updateSynced.current) return;
    updateSynced.current = true;
    refetch();
    setTokensDirty(false);
  }, [updateSuccess, refetch]);

  // After depositETH confirms, refetch balance
  useEffect(() => {
    if (!depositSuccess) return;
    refetchETH();
  }, [depositSuccess, refetchETH]);

  // After updateBeneficiary confirms, refetch will
  useEffect(() => {
    if (!beneficiarySuccess || beneficiarySynced.current) return;
    beneficiarySynced.current = true;
    refetch();
  }, [beneficiarySuccess, refetch]);

  // Close confirmation dialog and reset latch on tx failure
  useEffect(() => {
    if (!revokeError) return;
    setRevokeConfirm(false);
    revokeClicked.current = false;
  }, [revokeError]);

  // After revokeWill confirms, sync DB
  useEffect(() => {
    if (!revokeSuccess || !address || revokeSynced.current) return;
    revokeSynced.current = true;
    setRevokeConfirm(false);
    fetch("/api/will", {
      headers: { "x-wallet-address": address },
    })
      .then((r) => r.json())
      .then((data) => {
        const willId = data?.wills?.[0]?.id;
        if (!willId) return;
        return fetch(`/api/will/${willId}`, {
          method: "DELETE",
          headers: { "x-wallet-address": address },
        });
      })
      .catch(() => {});
  }, [revokeSuccess, address]);

  // After on-chain signAlive confirms, sync DB
  useEffect(() => {
    if (!aliveSuccess || !aliveHash || !address || aliveSynced.current) return;
    aliveSynced.current = true;
    fetch("/api/alive", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wallet-address": address,
      },
      body: JSON.stringify({ source: "dashboard", txHash: aliveHash }),
    }).catch(() => {});
  }, [aliveSuccess, aliveHash, address]);

  // Token management handlers
  const addLocalToken = (addr: string) => {
    if (
      !isAddress(addr) ||
      localTokens.some((t) => t.toLowerCase() === addr.toLowerCase())
    )
      return;
    setLocalTokens((prev) => [...prev, addr]);
    setTokensDirty(true);
  };

  const removeLocalToken = (index: number) => {
    setLocalTokens((prev) => prev.filter((_, i) => i !== index));
    setTokensDirty(true);
  };

  const handleSaveTokens = () => {
    if (localTokens.length === 0) return;
    updateTokens(localTokens as `0x${string}`[]);
  };

  // Grace period calculations
  const now = Math.floor(Date.now() / 1000);
  const lastAlive = will ? Number(will.lastAlive) : 0;
  const gracePeriodSec = will ? Number(will.gracePeriod) : 0;
  const gracePeriodDays = Math.ceil(gracePeriodSec / 86400);
  const deadline = lastAlive + gracePeriodSec;
  const activeRemainingDays = Math.ceil((deadline - now) / 86400);
  const inGrace = !!(hasWill && now > deadline);

  return (
    <WalletGuard>
      <div className="min-h-screen bg-bg">
        <DashHeader />
        {inGrace && (
          <GraceBanner
            remainingDays={Math.max(0, activeRemainingDays)}
            onCheckin={signAlive}
          />
        )}

        {isLoading && (
          <div className="max-w-[1240px] mx-auto px-6 py-20 text-center md:px-12">
            <p className="text-ink-3">Loading your will...</p>
          </div>
        )}

        {!isLoading && !hasWill && (
          <div className="max-w-[1240px] mx-auto px-6 py-20 text-center md:px-12">
            <h2 className="serif text-4xl mb-4">No will found.</h2>
            <p className="text-ink-2 mb-8">
              You haven&apos;t created a will yet. Protect your crypto legacy
              now.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 rounded-pill bg-ink text-paper px-6 py-3 text-[15px] font-medium no-underline"
            >
              Create Your Will
            </Link>
          </div>
        )}

        {!isLoading && hasWill && will && (
          <div className="max-w-[1240px] mx-auto px-6 py-12 md:px-12">
            {/* Title row */}
            <div className="grid grid-cols-1 gap-8 items-end mb-10 lg:grid-cols-[1.4fr_0.9fr] lg:gap-12">
              <div>
                <div className="text-xs tracking-[0.14em] uppercase text-ink-3 mb-3">
                  Your will ·{" "}
                  {inGrace ? "In grace period" : "Active on Base"}
                </div>
                <h1 className="serif text-5xl leading-none m-0 tracking-[-0.02em] lg:text-[64px]">
                  {inGrace ? (
                    <>
                      We haven&apos;t heard from you
                      <br />
                      <em className="text-accent">in a little while.</em>
                    </>
                  ) : (
                    <>
                      Everything&apos;s
                      <br />
                      <em className="text-accent">in order.</em>
                    </>
                  )}
                </h1>
              </div>
              <div className="text-[15px] leading-relaxed text-ink-2 max-w-[380px]">
                {inGrace
                  ? "Sign the message below — your timer resets to zero. No funds will move during this grace period."
                  : `Your check-in resets the timer. After ${gracePeriodDays} days of silence, anyone can call executeWill().`}
              </div>
            </div>

            {/* Create another will link */}
            <div className="mb-6">
              <Link
                href="/create"
                className="text-accent text-sm font-medium no-underline hover:underline"
              >
                + Create another will
              </Link>
            </div>

            {/* Checkin card */}
            <CheckinCard
              grace={inGrace}
              gracePeriod={gracePeriodDays}
              activeRemaining={activeRemainingDays}
              email={undefined}
              onCheckin={signAlive}
              isPending={isSigningAlive}
              isSuccess={aliveSuccess}
            />

            {/* Assets + Beneficiary */}
            <div className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-[1.4fr_0.9fr]">
              <AssetsCard
                tokens={will.tokens}
                localTokens={localTokens}
                onAddToken={addLocalToken}
                onRemoveToken={removeLocalToken}
                onSaveTokens={handleSaveTokens}
                tokensDirty={tokensDirty}
                isUpdating={isUpdatingTokens}
                updateSuccess={updateSuccess}
                prices={prices}
                tokenBalances={tokenBalances}
              />
              <BeneficiaryCard
                beneficiary={will.beneficiary}
                ownerAddress={address || ""}
                willId={dbWillId || ""}
                beneficiaryEmail={dbWill?.beneficiary_email}
                onUpdate={updateBeneficiary}
                onUpdateEmail={handleUpdateBeneficiaryEmail}
                isPending={isUpdatingBeneficiary}
                isSuccess={beneficiarySuccess}
                error={beneficiaryError}
                emailSaving={emailSaving}
                emailSaved={emailSaved}
              />
            </div>

            {/* NFTs — V2 wills include NFT data */}
            {(() => {
              const w = will as unknown as { nfts?: { contractAddr: string; tokenId: bigint; amount: bigint; nftType: number }[] };
              return w.nfts && w.nfts.length > 0 ? <NFTsCard nfts={w.nfts} /> : null;
            })()}

            {/* ETH Deposit */}
            <ETHDepositCard
              depositedETH={depositedETH}
              onDeposit={depositETH}
              isPending={isDepositing}
              isSuccess={depositSuccess}
              error={depositError}
              ethPrice={prices?.["eth"]}
            />

            {/* Activity */}
            <ActivityList grace={inGrace} />

            {/* Revoke */}
            <div className="mt-8">
              {!revokeConfirm ? (
                <button
                  onClick={() => setRevokeConfirm(true)}
                  disabled={revokeSuccess}
                  className="rounded-pill border border-danger text-danger bg-transparent px-5 py-2.5 text-sm font-medium cursor-pointer disabled:opacity-50"
                >
                  {revokeSuccess ? "Revoked" : "Revoke Will"}
                </button>
              ) : (
                <div className="rounded-cards border border-danger p-6 max-w-[600px] space-y-3">
                  <p className="text-sm font-medium text-danger">
                    Revoking your will is permanent. Any deposited ETH will be
                    refunded. Your token approvals remain — revoke them manually
                    if needed.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRevokeConfirm(false)}
                      disabled={isRevoking}
                      className="flex-1 rounded-pill border border-line bg-transparent text-ink px-4 py-2.5 text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (revokeClicked.current) return;
                        revokeClicked.current = true;
                        revokeWill();
                      }}
                      disabled={isRevoking}
                      className="flex-1 rounded-pill bg-danger text-white border-none px-4 py-2.5 text-sm font-medium cursor-pointer disabled:opacity-50"
                    >
                      {isRevoking ? "Revoking..." : "Yes, Revoke"}
                    </button>
                  </div>
                </div>
              )}
              {revokeSuccess && (
                <p className="text-sm text-warn mt-3">
                  Will revoked. Deposited ETH refunded. Reload to see updated
                  state.
                </p>
              )}
            </div>

            {/* Trust strip */}
            <TrustStrip />
          </div>
        )}
      </div>
    </WalletGuard>
  );
}
