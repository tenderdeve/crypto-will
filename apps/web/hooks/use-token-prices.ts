"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAccount } from "wagmi";
import { TokenPrice } from "@/lib/prices/types";

const REFRESH_INTERVAL_MS = 60 * 1000; // 60 seconds

export function useTokenPrices(tokenAddresses: string[]) {
  const { chainId } = useAccount();
  const [prices, setPrices] = useState<Record<string, TokenPrice>>({});
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stabilise the address list so it doesn't trigger re-renders on every frame
  const addressKey = tokenAddresses
    .map((a) => a.toLowerCase())
    .sort()
    .join(",");
  const stableAddresses = useMemo(
    () => tokenAddresses.filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addressKey]
  );

  const fetchPrices = useCallback(async () => {
    if (!chainId || stableAddresses.length === 0) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenAddresses: stableAddresses,
          chainId,
        }),
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data.prices) {
        setPrices(data.prices);
      }
    } catch {
      // Price fetch failed — keep stale data
    } finally {
      setIsLoading(false);
    }
  }, [stableAddresses, chainId]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Refresh on interval (only when there are tokens to price)
  useEffect(() => {
    if (stableAddresses.length === 0) return;
    intervalRef.current = setInterval(fetchPrices, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPrices, stableAddresses.length]);

  return { prices, isLoading };
}
