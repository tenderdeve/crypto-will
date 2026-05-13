"use client";

interface WillSelectorProps {
  wills: Array<{
    willId: bigint;
    beneficiary?: `0x${string}`;
    active?: boolean;
  }>;
  selectedWillId: bigint | undefined;
  onSelect: (willId: bigint) => void;
}

export function WillSelector({ wills, selectedWillId, onSelect }: WillSelectorProps) {
  if (wills.length <= 1) return null;

  const short = (addr: string) => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "");

  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-xs tracking-[0.14em] uppercase text-ink-3">Will:</span>
      <div className="flex gap-1.5 flex-wrap">
        {wills.map((w, i) => {
          const isActive = selectedWillId === w.willId;
          return (
            <button
              key={w.willId.toString()}
              onClick={() => onSelect(w.willId)}
              className={`px-3 py-1.5 rounded-pill text-[13px] font-medium cursor-pointer border transition-colors ${
                isActive
                  ? "bg-ink text-paper border-ink"
                  : "bg-transparent text-ink border-line hover:border-ink"
              }`}
            >
              #{i + 1}
              {w.beneficiary ? ` · ${short(w.beneficiary)}` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
