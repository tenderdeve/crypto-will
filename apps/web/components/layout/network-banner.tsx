"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";

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
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-center gap-3 text-sm">
      <span className="text-destructive font-medium">
        Wrong network — switch to {expectedName} to use CryptoWill.
      </span>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => switchChain({ chainId: EXPECTED_CHAIN_ID })}
        disabled={isPending}
      >
        {isPending ? "Switching..." : `Switch to ${expectedName}`}
      </Button>
    </div>
  );
}
