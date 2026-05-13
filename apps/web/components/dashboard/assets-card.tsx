"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { Check } from "lucide-react";
import { TokenPrice } from "@/lib/prices/types";
import { formatUSD } from "@/lib/format";

export function AssetsCard({
  tokens,
  localTokens,
  onAddToken,
  onRemoveToken,
  onSaveTokens,
  tokensDirty,
  isUpdating,
  updateSuccess,
  prices,
  tokenBalances,
}: {
  tokens: readonly `0x${string}`[];
  localTokens: string[];
  onAddToken: (addr: string) => void;
  onRemoveToken: (i: number) => void;
  onSaveTokens: () => void;
  tokensDirty: boolean;
  isUpdating: boolean;
  updateSuccess: boolean;
  prices?: Record<string, TokenPrice>;
  tokenBalances?: Record<string, number>;
}) {
  const [input, setInput] = useState("");

  // Compute total portfolio USD value across all tokens
  const totalUSD = localTokens.reduce((sum, addr) => {
    const price = prices?.[addr.toLowerCase()];
    const balance = tokenBalances?.[addr.toLowerCase()];
    if (price && balance) return sum + price.usd * balance;
    return sum;
  }, 0);
  const hasPriceData = prices && Object.keys(prices).length > 0;

  const handleAdd = () => {
    if (!isAddress(input) || localTokens.some((t) => t.toLowerCase() === input.toLowerCase())) return;
    onAddToken(input);
    setInput("");
  };

  return (
    <div className="bg-paper border border-line rounded-cards-lg p-7">
      <div className="flex justify-between items-baseline mb-1.5">
        <div>
          <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3">
            Earmarked for beneficiary
          </div>
          <div className="serif text-3xl mt-1 leading-none">
            {tokens.length} token{tokens.length !== 1 ? "s" : ""}
          </div>
        </div>
        {hasPriceData && totalUSD > 0 && (
          <div className="text-right">
            <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3">
              Total value
            </div>
            <div className="serif text-2xl mt-0.5 leading-none">
              {formatUSD(totalUSD)}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-1 mt-4">
        {localTokens.map((t, i) => {
          const price = prices?.[t.toLowerCase()];
          const balance = tokenBalances?.[t.toLowerCase()];
          const usdValue = price && balance ? price.usd * balance : null;

          return (
            <div
              key={t}
              className="grid items-center gap-4 py-3.5 px-2 border-t border-line-2"
              style={{ gridTemplateColumns: "1fr auto 90px" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold shrink-0">
                  T
                </div>
                <div>
                  <code className="text-xs text-ink truncate block max-w-[300px]">
                    {t}
                  </code>
                  <div className="text-[11px] text-good inline-flex items-center gap-1 mt-0.5">
                    <Check className="w-3 h-3" /> Approved
                  </div>
                </div>
              </div>
              <div className="text-right mono text-sm text-ink-2">
                {usdValue !== null ? formatUSD(usdValue) : "--"}
              </div>
              <div className="text-right">
                <button
                  onClick={() => onRemoveToken(i)}
                  disabled={isUpdating}
                  className="bg-transparent border-none text-ink-3 cursor-pointer text-xs underline hover:text-ink"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Token contract address (0x...)"
          className="flex-1 px-3 py-2 rounded-inputs border border-line bg-paper text-sm outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!isAddress(input) || localTokens.some((t) => t.toLowerCase() === input.toLowerCase())}
          className="rounded-pill border border-ink text-ink px-3.5 py-2 text-[13px] cursor-pointer bg-transparent disabled:opacity-40"
        >
          + Add
        </button>
      </div>

      {tokensDirty && (
        <button
          onClick={onSaveTokens}
          disabled={localTokens.length === 0 || isUpdating}
          className="w-full mt-3 rounded-pill bg-ink text-paper px-4 py-2.5 text-sm font-medium cursor-pointer border-none disabled:opacity-50"
        >
          {isUpdating ? "Saving..." : "Save Token Changes"}
        </button>
      )}
      {updateSuccess && (
        <p className="text-sm text-good mt-2">Token list updated on-chain.</p>
      )}

      <div className="mt-4 p-3 bg-bg-2 rounded-[10px] text-xs text-ink-3 leading-relaxed">
        Adding a token later requires a separate{" "}
        <code className="mono">approve()</code> tx — your existing approvals
        stay intact.
      </div>
    </div>
  );
}
