"use client";

import { useAccount, useSwitchChain } from "wagmi";

const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");

const CHAIN_NAMES: Record<number, string> = {
  31337: "Localhost (Anvil)",
  84532: "Base Sepolia",
  8453: "Base",
};

export function NetworkBanner() {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === EXPECTED_CHAIN_ID) return null;

  const expectedName = CHAIN_NAMES[EXPECTED_CHAIN_ID] ?? `Chain ${EXPECTED_CHAIN_ID}`;

  return (
    <div
      className="px-6 py-2.5 flex items-center justify-center gap-3 text-sm border-b md:px-12"
      style={{ background: "var(--danger)", color: "#fff5f1", borderColor: "rgba(0,0,0,0.1)" }}
    >
      <span className="font-medium">
        Wrong network — switch to {expectedName} to use ChainWill.
      </span>
      <button
        onClick={() => switchChain({ chainId: EXPECTED_CHAIN_ID })}
        disabled={isPending}
        className="px-3 py-1 rounded-pill border-none cursor-pointer text-sm font-medium disabled:opacity-50"
        style={{ background: "#fff5f1", color: "var(--danger)" }}
      >
        {isPending ? "Switching..." : `Switch to ${expectedName}`}
      </button>
    </div>
  );
}
