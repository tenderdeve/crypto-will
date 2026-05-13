"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { WalletGuard } from "@/components/wallet/wallet-guard";
import { Brand } from "@/components/landing/brand";
import { useGuardians } from "@/hooks/use-guardians";
import { useGuardianVote } from "@/hooks/use-guardian-vote";
import { Shield, CheckCircle, AlertTriangle } from "lucide-react";

function short(a: string) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "--";
}

export default function GuardianVotingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { address } = useAccount();

  const willIdRaw = params.willId as string;
  const ownerAddress = searchParams.get("owner") as `0x${string}` | null;
  const willId = willIdRaw ? BigInt(willIdRaw) : undefined;

  const {
    guardians,
    threshold,
    votes,
    votingEndsAt,
    votingActive,
    hasCurrentUserVoted,
    hasGuardians,
    isLoading,
    refetch,
  } = useGuardians(ownerAddress ?? undefined, willId);

  const {
    voteToExecute,
    voteAlive,
    isPending,
    isSuccess,
    error,
  } = useGuardianVote();

  const now = Math.floor(Date.now() / 1000);
  const votingExpired = votingActive && now > Number(votingEndsAt);
  const thresholdMet = Number(votes) >= threshold;

  const isGuardian =
    address &&
    guardians.some(
      (g: string) => g.toLowerCase() === address.toLowerCase()
    );

  const handleVoteExecute = () => {
    if (!ownerAddress || willId === undefined) return;
    voteToExecute(ownerAddress, willId);
  };

  const handleVoteAlive = () => {
    if (!ownerAddress || willId === undefined) return;
    voteAlive(ownerAddress, willId);
  };

  // Refetch after successful vote
  if (isSuccess) {
    refetch();
  }

  const votingEndsDate =
    votingEndsAt > BigInt(0)
      ? new Date(Number(votingEndsAt) * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <WalletGuard>
      <div className="min-h-screen bg-bg">
        <div className="max-w-[720px] mx-auto px-6 py-12 md:px-12">
          {/* Header */}
          <div className="mb-10">
            <Brand size={20} />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-accent" />
            <h1 className="serif text-4xl leading-none m-0">Guardian Voting</h1>
          </div>

          {isLoading ? (
            <div className="text-ink-3 py-12 text-center">
              Loading voting status...
            </div>
          ) : !ownerAddress || willId === undefined ? (
            <div className="rounded-cards border border-danger p-6">
              <p className="text-danger font-medium">
                Missing owner address or will ID in URL parameters.
              </p>
              <p className="text-sm text-ink-3 mt-2">
                Expected format: /guardian/WILL_ID?owner=0x...
              </p>
            </div>
          ) : !hasGuardians ? (
            <div className="rounded-cards border border-line p-6">
              <p className="text-ink-2">
                This will does not have a guardian system configured.
              </p>
            </div>
          ) : (
            <>
              {/* Will info */}
              <div className="rounded-cards-lg border border-line bg-paper p-7 mb-6">
                <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3 mb-3">
                  Will Details
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-ink-3">Owner</div>
                    <div className="mono text-sm mt-0.5">
                      {short(ownerAddress)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-3">Will ID</div>
                    <div className="mono text-sm mt-0.5">{willIdRaw}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-3">Threshold</div>
                    <div className="text-sm mt-0.5 font-medium">
                      {threshold} of {guardians.length} guardians
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-3">Votes</div>
                    <div className="text-sm mt-0.5 font-medium">
                      {Number(votes)} / {threshold}
                    </div>
                  </div>
                </div>
              </div>

              {/* Voting status */}
              {votingActive && !votingExpired && votingEndsDate && (
                <div className="rounded-inputs border border-accent bg-accent-soft p-4 mb-6 text-sm">
                  Voting window closes: <strong>{votingEndsDate}</strong>
                </div>
              )}

              {votingExpired && (
                <div className="rounded-inputs border border-warn bg-warn/5 p-4 mb-6 flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-warn shrink-0" />
                  <div className="text-sm">
                    The voting window has expired. A new voting session must be
                    started.
                  </div>
                </div>
              )}

              {thresholdMet && !votingExpired && (
                <div className="rounded-inputs border border-good bg-good/5 p-4 mb-6 flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-good shrink-0" />
                  <div className="text-sm">
                    Threshold reached. The will can now be executed.
                  </div>
                </div>
              )}

              {/* Your status */}
              {!isGuardian ? (
                <div className="rounded-cards border border-danger/30 bg-danger/5 p-6 mb-6">
                  <p className="text-sm font-medium text-danger">
                    Your connected wallet ({short(address || "")}) is not a
                    guardian for this will.
                  </p>
                  <p className="text-xs text-ink-3 mt-2">
                    Connect a wallet that is listed as a guardian.
                  </p>
                </div>
              ) : !votingActive ? (
                <div className="rounded-cards border border-line p-6 mb-6">
                  <p className="text-sm text-ink-2">
                    Voting has not started yet. The grace period must expire and
                    a voting session must be initiated first.
                  </p>
                </div>
              ) : hasCurrentUserVoted ? (
                <div className="rounded-cards border border-good/30 bg-good/5 p-6 mb-6 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-good shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      You have already voted in this session.
                    </p>
                    <p className="text-xs text-ink-3 mt-1">
                      Waiting for other guardians...
                    </p>
                  </div>
                </div>
              ) : votingExpired ? null : (
                /* Voting actions */
                <div className="rounded-cards-lg border border-line bg-paper p-7 mb-6">
                  <div className="text-[15px] font-medium mb-4">
                    Cast your vote
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      onClick={handleVoteExecute}
                      disabled={isPending}
                      className="rounded-pill bg-ink text-paper px-5 py-3.5 text-[15px] font-medium cursor-pointer border-none disabled:opacity-50"
                    >
                      {isPending ? "Confirming..." : "Vote to Execute"}
                    </button>
                    <button
                      onClick={handleVoteAlive}
                      disabled={isPending}
                      className="rounded-pill border border-good text-good bg-transparent px-5 py-3.5 text-[15px] font-medium cursor-pointer disabled:opacity-50"
                    >
                      {isPending ? "Confirming..." : "Vouch Owner is Alive"}
                    </button>
                  </div>
                  <p className="text-xs text-ink-3 mt-3">
                    &quot;Vote to Execute&quot; moves toward transferring funds.
                    &quot;Vouch Alive&quot; resets the timer if threshold is met.
                  </p>
                </div>
              )}

              {isSuccess && (
                <div className="rounded-inputs border border-good bg-good/5 p-4 mb-4 text-sm text-good">
                  Vote submitted successfully.
                </div>
              )}

              {error && (
                <div className="rounded-inputs border border-danger p-4 mb-4 text-sm text-danger">
                  Error: {error.message.slice(0, 200)}
                </div>
              )}

              {/* Guardian list */}
              <div className="rounded-cards border border-line p-6">
                <div className="text-[13px] text-ink-2 font-medium mb-3">
                  All Guardians
                </div>
                <div className="space-y-2">
                  {guardians.map((g: string, i: number) => (
                    <div
                      key={g}
                      className={`flex items-center justify-between mono text-xs px-3 py-2 rounded-inputs border ${
                        address && g.toLowerCase() === address.toLowerCase()
                          ? "border-accent bg-accent-soft"
                          : "border-line bg-paper"
                      }`}
                    >
                      <span>
                        {i + 1}. {short(g)}
                      </span>
                      {address &&
                        g.toLowerCase() === address.toLowerCase() && (
                          <span className="text-accent text-[10px] uppercase tracking-wide font-medium">
                            You
                          </span>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </WalletGuard>
  );
}
