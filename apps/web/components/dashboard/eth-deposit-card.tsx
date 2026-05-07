"use client";

import { useState } from "react";
import { parseEther, formatEther } from "viem";

export function ETHDepositCard({
  depositedETH,
  onDeposit,
  isPending,
  isSuccess,
  error,
}: {
  depositedETH: bigint;
  onDeposit: (wei: bigint) => void;
  isPending: boolean;
  isSuccess: boolean;
  error: Error | null;
}) {
  const [amt, setAmt] = useState("");

  const valid = (() => {
    try {
      return parseEther(amt) > BigInt(0);
    } catch {
      return false;
    }
  })();

  const handleDeposit = () => {
    try {
      const wei = parseEther(amt);
      if (wei <= BigInt(0)) return;
      onDeposit(wei);
      setAmt("");
    } catch {}
  };

  return (
    <div
      className="mt-6 p-7 rounded-cards-lg border border-line grid grid-cols-1 gap-8 items-center md:grid-cols-2"
      style={{ background: "linear-gradient(135deg, var(--bg-2), var(--paper))" }}
    >
      <div>
        <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3">
          ETH in your will
        </div>
        <div className="serif text-[40px] leading-[1.05] mt-2 tracking-[-0.015em]">
          {formatEther(depositedETH)} ETH{" "}
          <span className="text-ink-3 text-[22px]">deposited</span>
        </div>
        <div className="text-sm text-ink-2 leading-relaxed mt-3 max-w-[460px]">
          Unlike ERC-20s (which stay in your wallet under approval), ETH must
          be <em>parked</em> in the contract. You can withdraw it any time.
        </div>
      </div>
      <div className="bg-paper border border-line rounded-[14px] p-5">
        <div className="text-xs text-ink-3 mb-2">Deposit more ETH</div>
        <div className="flex gap-2 items-stretch">
          <div className="flex-1 flex items-center px-3.5 py-3 border border-line rounded-inputs bg-bg">
            <input
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              type="number"
              min="0"
              step="0.001"
              placeholder="0.5"
              className="border-none bg-transparent outline-none w-full text-lg"
            />
            <span className="text-[13px] text-ink-3 ml-2">ETH</span>
          </div>
          <button
            onClick={handleDeposit}
            disabled={!valid || isPending}
            className="rounded-pill bg-ink text-paper px-5 py-3 text-[15px] font-medium cursor-pointer border-none disabled:opacity-50"
          >
            {isPending ? "..." : "Deposit"}
          </button>
        </div>
        {error && (
          <p className="text-xs text-danger mt-2">{error.message.slice(0, 100)}</p>
        )}
        {isSuccess && (
          <p className="text-sm text-good mt-2">ETH deposited. Balance updated.</p>
        )}
      </div>
    </div>
  );
}
