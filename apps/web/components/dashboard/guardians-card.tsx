"use client";

import { Shield, Users, Vote, Clock } from "lucide-react";

function short(a: string) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "--";
}

export function GuardiansCard({
  guardians,
  threshold,
  votingWindow,
  votes,
  votingEndsAt,
  votingActive,
}: {
  guardians: readonly `0x${string}`[];
  threshold: number;
  votingWindow: bigint;
  votes: bigint;
  votingEndsAt: bigint;
  votingActive: boolean;
}) {
  const hasGuardians = guardians.length > 0;
  const votingWindowDays = Number(votingWindow) / 86400;
  const votingEndsDate = votingEndsAt > BigInt(0)
    ? new Date(Number(votingEndsAt) * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const now = Math.floor(Date.now() / 1000);
  const votingExpired = votingActive && now > Number(votingEndsAt);
  const thresholdMet = Number(votes) >= threshold;

  return (
    <div className="bg-bg-2 border border-line rounded-cards-lg p-7 mt-6">
      <div className="flex items-center gap-2.5 mb-5">
        <Shield className="w-5 h-5 text-accent" />
        <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3">
          Guardian System
        </div>
      </div>

      {!hasGuardians ? (
        <div className="text-[15px] text-ink-2 leading-relaxed">
          <p className="mb-2">
            No guardians configured. Your will executes automatically when the
            grace period expires.
          </p>
          <p className="text-[13px] text-ink-3">
            Add guardians from the create page to require M-of-N approval before
            execution.
          </p>
        </div>
      ) : (
        <>
          {/* Config summary */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-paper border border-line rounded-inputs p-3">
              <div className="flex items-center gap-1.5 text-ink-3 text-[11px] uppercase tracking-wide mb-1">
                <Users className="w-3.5 h-3.5" /> Guardians
              </div>
              <div className="serif text-xl">{guardians.length}</div>
            </div>
            <div className="bg-paper border border-line rounded-inputs p-3">
              <div className="flex items-center gap-1.5 text-ink-3 text-[11px] uppercase tracking-wide mb-1">
                <Vote className="w-3.5 h-3.5" /> Threshold
              </div>
              <div className="serif text-xl">
                {threshold}/{guardians.length}
              </div>
            </div>
            <div className="bg-paper border border-line rounded-inputs p-3">
              <div className="flex items-center gap-1.5 text-ink-3 text-[11px] uppercase tracking-wide mb-1">
                <Clock className="w-3.5 h-3.5" /> Window
              </div>
              <div className="serif text-xl">{votingWindowDays}d</div>
            </div>
          </div>

          {/* Guardian addresses */}
          <div className="mb-5">
            <div className="text-[13px] text-ink-2 font-medium mb-2">
              Guardian addresses
            </div>
            <div className="space-y-1.5">
              {guardians.map((g, i) => (
                <div
                  key={g}
                  className="mono text-xs text-ink-3 bg-paper border border-line rounded-inputs px-3 py-2"
                >
                  {i + 1}. {short(g)}
                </div>
              ))}
            </div>
          </div>

          {/* Voting status */}
          {votingActive && (
            <div
              className={`rounded-inputs border p-4 ${
                votingExpired
                  ? "border-warn bg-warn/5"
                  : thresholdMet
                  ? "border-good bg-good/5"
                  : "border-accent bg-accent-soft"
              }`}
            >
              <div className="text-[13px] font-medium mb-1">
                {votingExpired
                  ? "Voting window expired"
                  : thresholdMet
                  ? "Threshold reached — will can be executed"
                  : "Voting in progress"}
              </div>
              <div className="text-sm text-ink-2">
                <span className="font-medium">
                  {Number(votes)}/{threshold}
                </span>{" "}
                votes collected
                {votingEndsDate && !votingExpired && (
                  <span className="text-ink-3"> — ends {votingEndsDate}</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
