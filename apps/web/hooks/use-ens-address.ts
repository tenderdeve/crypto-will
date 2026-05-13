"use client";

import { useQuery } from "@tanstack/react-query";
import { mainnetClient } from "@/lib/ens";

/**
 * Resolves a `.eth` name to an Ethereum address (forward lookup).
 * Used in the create flow to accept ENS names as beneficiary input.
 * Cached for 1 hour (ENS records rarely change).
 */
export function useEnsAddress(name: string | undefined) {
  const enabled = !!name && name.endsWith(".eth") && name.length > 4;

  const { data: ensAddress, isLoading } = useQuery({
    queryKey: ["ensAddress", name],
    queryFn: async () => {
      if (!name) return null;
      try {
        return await mainnetClient.getEnsAddress({ name });
      } catch {
        return null;
      }
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  return { ensAddress: ensAddress ?? null, isLoading: enabled && isLoading };
}
