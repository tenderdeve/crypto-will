"use client";

import { useAccount, useReadContracts } from "wagmi";
import { useState, useEffect } from "react";
import { formatUnits } from "viem";
import { ERC20_ABI } from "@/lib/contracts";

export interface TokenInfo {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  balance: string;
  rawBalance: bigint;
}

// Known tokens for local dev / Base Sepolia
const KNOWN_TOKENS: `0x${string}`[] = (
  process.env.NEXT_PUBLIC_KNOWN_TOKENS?.split(",") || []
).filter(Boolean) as `0x${string}`[];

export function useWalletTokens() {
  const { address, chainId } = useAccount();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedAddresses, setDetectedAddresses] = useState<`0x${string}`[]>([]);

  // Try to fetch token balances from Alchemy/RPC provider
  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    async function fetchTokens() {
      setIsLoading(true);
      try {
        const isLocal = chainId === 31337 || chainId === 1337;

        if (isLocal) {
          // Local dev — use known tokens
          setDetectedAddresses(KNOWN_TOKENS);
          setIsLoading(false);
          return;
        }

        const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_URL;

        if (!rpcUrl) {
          // No Alchemy URL — fall back to known tokens
          setDetectedAddresses(KNOWN_TOKENS);
          setIsLoading(false);
          return;
        }

        // Alchemy token balance API
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "alchemy_getTokenBalances",
            params: [address, "erc20"],
            id: 1,
          }),
        });

        const data = await response.json();

        if (data.result?.tokenBalances) {
          const nonZero = data.result.tokenBalances
            .filter((t: { tokenBalance: string }) => t.tokenBalance !== "0x0000000000000000000000000000000000000000000000000000000000000000")
            .map((t: { contractAddress: string }) => t.contractAddress as `0x${string}`);
          setDetectedAddresses(nonZero);
        } else {
          // Fallback to known tokens
          setDetectedAddresses(KNOWN_TOKENS);
        }
      } catch {
        setDetectedAddresses(KNOWN_TOKENS);
      }
      setIsLoading(false);
    }

    fetchTokens();
  }, [address, chainId]);

  // Fetch token metadata + balances via multicall
  const allAddresses = detectedAddresses;

  const { data: tokenData } = useReadContracts({
    contracts: allAddresses.flatMap((tokenAddr) => [
      { address: tokenAddr, abi: ERC20_ABI, functionName: "symbol" },
      { address: tokenAddr, abi: ERC20_ABI, functionName: "decimals" },
      {
        address: tokenAddr,
        abi: [{
          type: "function",
          name: "balanceOf",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
        }] as const,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
      },
    ]),
    query: { enabled: allAddresses.length > 0 && !!address },
  });

  // Parse results into TokenInfo
  useEffect(() => {
    if (!tokenData || allAddresses.length === 0) return;

    const parsed: TokenInfo[] = [];
    for (let i = 0; i < allAddresses.length; i++) {
      const symbolResult = tokenData[i * 3];
      const decimalsResult = tokenData[i * 3 + 1];
      const balanceResult = tokenData[i * 3 + 2];

      if (symbolResult.status === "success" && decimalsResult.status === "success" && balanceResult.status === "success") {
        const decimals = decimalsResult.result as number;
        const rawBalance = balanceResult.result as bigint;

        if (rawBalance > BigInt(0)) {
          parsed.push({
            address: allAddresses[i],
            symbol: symbolResult.result as string,
            decimals,
            balance: formatUnits(rawBalance, decimals),
            rawBalance,
          });
        }
      }
    }
    setTokens(parsed);
  }, [tokenData, allAddresses]);

  return { tokens, isLoading };
}
