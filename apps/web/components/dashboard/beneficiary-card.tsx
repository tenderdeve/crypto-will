"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { Mail } from "lucide-react";

function short(a: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
}

export function BeneficiaryCard({
  beneficiary,
  ownerAddress,
  onUpdate,
  isPending,
  isSuccess,
  error,
}: {
  beneficiary: string;
  ownerAddress: string;
  onUpdate: (addr: `0x${string}`) => void;
  isPending: boolean;
  isSuccess: boolean;
  error: Error | null;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  const valid =
    isAddress(input) &&
    input.toLowerCase() !== ownerAddress?.toLowerCase() &&
    input.toLowerCase() !== beneficiary?.toLowerCase();

  return (
    <div className="bg-bg-2 border border-line rounded-cards-lg p-7 flex flex-col">
      <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3">
        Beneficiary
      </div>
      <div className="flex items-center gap-4 mt-4">
        <div className="w-12 h-12 rounded-full shrink-0" style={{ background: "linear-gradient(135deg,#cfe7e2,#3d5a3a)" }} />
        <div>
          <div className="serif text-2xl leading-[1.1]">Single recipient</div>
          <div className="mono text-xs text-ink-3 mt-1">
            {short(beneficiary)}
          </div>
        </div>
      </div>

      {/* Sealed letter teaser */}
      <div className="mt-4 p-4 rounded-inputs bg-paper border border-dashed border-line text-[13px] text-ink-2 leading-relaxed">
        <div className="text-[10px] tracking-[0.14em] uppercase text-ink-3 mb-1.5">
          Sealed letter
        </div>
        <span className="italic text-ink-3">
          Encrypted note for your beneficiary —{" "}
        </span>
        <span className="inline-block ml-1 px-2 py-0.5 rounded-pill bg-accent-soft text-accent text-[10px] font-medium tracking-[0.06em] uppercase">
          Coming soon
        </span>
      </div>

      {/* Edit beneficiary */}
      <div className="mt-auto pt-5">
        {!editing ? (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setEditing(true)}
              className="bg-transparent border border-line text-ink-2 px-3 py-1.5 rounded-pill text-[13px] cursor-pointer hover:border-ink hover:text-ink"
            >
              Edit beneficiary
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="New beneficiary (0x...)"
                className="flex-1 px-3 py-2 rounded-inputs border border-line bg-paper text-sm outline-none"
              />
              <button
                onClick={() => { onUpdate(input as `0x${string}`); setEditing(false); setInput(""); }}
                disabled={!valid || isPending}
                className="rounded-pill bg-ink text-paper px-3.5 py-2 text-[13px] cursor-pointer border-none disabled:opacity-50"
              >
                {isPending ? "..." : "Update"}
              </button>
              <button
                onClick={() => { setEditing(false); setInput(""); }}
                className="bg-transparent border-none text-ink-3 cursor-pointer text-sm"
              >
                ×
              </button>
            </div>
            {input && !isAddress(input) && (
              <p className="text-xs text-danger">Invalid address</p>
            )}
            {input && isAddress(input) && input.toLowerCase() === ownerAddress?.toLowerCase() && (
              <p className="text-xs text-danger">Cannot be your own address</p>
            )}
          </div>
        )}
        {isSuccess && (
          <p className="text-sm text-good mt-2">Beneficiary updated on-chain.</p>
        )}
        {error && (
          <p className="text-xs text-danger mt-2">{error.message.slice(0, 100)}</p>
        )}
      </div>
    </div>
  );
}
