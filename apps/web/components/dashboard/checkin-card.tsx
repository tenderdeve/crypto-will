"use client";

import { Sparkles } from "lucide-react";
import { CountdownRing } from "./countdown-ring";

export function CheckinCard({
  grace,
  gracePeriod,
  activeRemaining,
  email,
  onCheckin,
  isPending,
  isSuccess,
}: {
  grace: boolean;
  gracePeriod: number;
  activeRemaining: number;
  email?: string;
  onCheckin: () => void;
  isPending: boolean;
  isSuccess: boolean;
}) {
  const total = gracePeriod;
  const elapsed = grace ? total : total - activeRemaining;
  const pct = Math.min(1, elapsed / total);
  const ringColor = grace ? "var(--danger)" : "var(--good)";

  return (
    <div
      className="rounded-hero p-9 grid grid-cols-1 gap-8 items-center border lg:grid-cols-[1fr_260px] lg:gap-12"
      style={{
        background: grace ? "var(--paper)" : "var(--ink)",
        color: grace ? "var(--ink)" : "var(--paper)",
        borderColor: grace ? "var(--line)" : "var(--ink)",
      }}
    >
      <div>
        <div className="text-xs tracking-[0.14em] uppercase opacity-60">
          Proof of life · On-chain signAlive()
        </div>
        <div className="serif text-3xl leading-[1.05] mt-2.5 mb-2 tracking-[-0.015em] md:text-[44px]">
          {grace ? (
            "Sign now to reset your will."
          ) : (
            <>
              {activeRemaining} days until{" "}
              <em>your will is executable</em>
            </>
          )}
        </div>
        <div className="text-[15px] leading-relaxed opacity-70 max-w-[540px]">
          {grace
            ? "One signature in your wallet. No funds move during this grace period — it's just a clock that resets when you sign."
            : `We'll email ${email || "you"} on the 1st of each month. Signing any time before day ${gracePeriod} resets the timer.`}
        </div>
        <div className="mt-5 flex gap-2.5">
          <button
            onClick={onCheckin}
            disabled={isPending}
            className="inline-flex items-center gap-2.5 rounded-pill bg-accent text-accent-ink px-5 py-3 text-[15px] font-medium cursor-pointer border-none disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isPending
              ? "Signing..."
              : isSuccess
              ? "Confirmed! ✓"
              : grace
              ? "Sign \"I'm here\""
              : "Check in early"}
          </button>
        </div>
        {isSuccess && (
          <p className="text-sm mt-3" style={{ color: "var(--good)" }}>
            Alive check confirmed on-chain. Timer reset.
          </p>
        )}
      </div>
      <div className="flex justify-center">
        <CountdownRing
          pct={pct}
          color={ringColor}
          bg={grace ? "var(--line)" : "rgba(255,255,255,0.12)"}
          big={String(Math.max(0, activeRemaining))}
          unit="days"
          sub={grace ? "since last check-in" : `of ${gracePeriod}-day grace`}
          textColor={grace ? "var(--ink)" : "var(--paper)"}
        />
      </div>
    </div>
  );
}
