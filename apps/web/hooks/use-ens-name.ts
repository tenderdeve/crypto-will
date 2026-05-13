"use client";

import { useQuery } from "@tanstack/react-query";
import { type Address, isAddress } from "viem";
import { mainnetClient } from "@/lib/ens";

/**
 * Resolves an Ethereum address to its ENS name (reverse lookup).
 * Uses a standalone mainnet client — ENS lives on L1, not Base.
 * Cached for 1 hour (ENS names rarely change).
 */
export function useEnsName(address: Address | string | undefined) {
  const enabled = !!address && isAddress(address);

  const { data: ensName, isLoading } = useQuery({
    queryKey: ["ensName", address],
    queryFn: async () => {
      if (!address || !isAddress(address)) return null;
      try {
        return await mainnetClient.getEnsName({ address });
      } catch {
        return null;
      }
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  return { ensName: ensName ?? null, isLoading: enabled && isLoading };
}
