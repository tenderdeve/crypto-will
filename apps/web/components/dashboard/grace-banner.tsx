"use client";

import { useState, useEffect } from "react";
import { Clock, ArrowRight } from "lucide-react";

export function GraceBanner({
  remainingDays,
  onCheckin,
}: {
  remainingDays: number;
  onCheckin: () => void;
}) {
  const [t, setT] = useState({ d: remainingDays, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const id = setInterval(() => {
      setT((x) => {
        let { d, h, m, s } = x;
        s -= 1;
        if (s < 0) { s = 59; m -= 1; }
        if (m < 0) { m = 59; h -= 1; }
        if (h < 0) { h = 23; d -= 1; }
        if (d < 0) { d = 0; h = 0; m = 0; s = 0; }
        return { d, h, m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-4 justify-between items-center px-6 py-5 md:flex-row md:px-12" style={{ background: "var(--danger)", color: "#fff5f1" }}>
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs tracking-[0.16em] uppercase opacity-75">
            Grace period — your will is now executable in:
          </div>
          <div className="serif text-xl leading-[1.1] mt-1 md:text-[26px]">
            Sign in before the timer ends, or anyone can trigger your will.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex gap-2">
          {[
            ["Days", t.d],
            ["Hrs", String(t.h).padStart(2, "0")],
            ["Min", String(t.m).padStart(2, "0")],
            ["Sec", String(t.s).padStart(2, "0")],
          ].map(([l, v]) => (
            <div
              key={l as string}
              className="min-w-[64px] text-center px-2.5 py-2 rounded-[10px] bg-black/20"
            >
              <div className="mono text-[22px] font-semibold">{v}</div>
              <div className="text-[10px] tracking-[0.16em] uppercase opacity-70">
                {l}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onCheckin}
          className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-pill border-none text-[15px] font-semibold cursor-pointer shrink-0"
          style={{ background: "#fff5f1", color: "var(--danger)" }}
        >
          I&apos;m here — sign now <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
