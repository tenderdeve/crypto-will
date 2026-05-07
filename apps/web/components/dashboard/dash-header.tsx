"use client";

import { useAccount, useDisconnect } from "wagmi";
import { Brand } from "@/components/landing/brand";

export function DashHeader() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return (
    <header className="flex items-center justify-between px-6 py-5 border-b border-line-2 bg-bg md:px-12">
      <Brand size={20} />
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 px-3 py-1.5 rounded-pill bg-paper border border-line text-[11px] tracking-[0.06em] text-ink-2 md:flex">
          <span className="w-2 h-2 rounded-full" style={{ background: "#0052ff" }} />
          BASE
        </div>
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-pill bg-paper border border-line text-[13px]">
          <span className="w-2 h-2 rounded-full bg-good" />
          <span className="mono">{short}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="bg-transparent border border-line px-3.5 py-2 rounded-pill cursor-pointer text-[13px] text-ink-2 hover:border-ink hover:text-ink"
        >
          Disconnect
        </button>
      </div>
    </header>
  );
}
