"use client";

import { useEnsName } from "@/hooks/use-ens-name";

function short(a: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
}

/**
 * Reusable ENS-aware address display.
 * Shows the ENS name (with full address as tooltip) when available,
 * falls back to a truncated hex address. Never blocks rendering.
 */
export function EnsAddress({
  address,
  className,
}: {
  address: string;
  className?: string;
}) {
  const { ensName } = useEnsName(address);

  if (ensName) {
    return (
      <span className={className} title={address}>
        {ensName}
      </span>
    );
  }

  return (
    <span className={className} title={address}>
      {short(address)}
    </span>
  );
}
