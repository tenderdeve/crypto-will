"use client";

import { useReadContract, useReadContracts, useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  CRYPTO_WILL_ABI,
  CRYPTO_WILL_ADDRESS,
  CRYPTO_WILL_V2_ABI,
  CRYPTO_WILL_V2_ADDRESS,
} from "@/lib/contracts";

// ─── V2 multi-will hooks ───────────────────────────────────────────

export function useWillV2() {
  const { address } = useAccount();
  const contractAddress = CRYPTO_WILL_V2_ADDRESS;

  // Get active will IDs
  const { data: activeWillIds, isLoading: idsLoading, refetch: refetchIds } = useReadContract({
    address: contractAddress,
    abi: CRYPTO_WILL_V2_ABI,
    functionName: "getActiveWillIds",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contractAddress },
  });

  // Read each active will
  const willContracts = (activeWillIds || []).map((willId: bigint) => ({
    address: contractAddress,
    abi: CRYPTO_WILL_V2_ABI,
    functionName: "getWill" as const,
    args: [address!, willId] as const,
  }));

  const { data: willResults, isLoading: willsLoading, refetch: refetchWills } = useReadContracts({
    contracts: willContracts,
    query: { enabled: willContracts.length > 0 },
  });

  // Build wills array with their IDs
  const wills = (activeWillIds || []).map((willId: bigint, i: number) => ({
    willId,
    ...(willResults?.[i]?.result as {
      owner: `0x${string}`;
      beneficiary: `0x${string}`;
      tokens: readonly `0x${string}`[];
      lastAlive: bigint;
      gracePeriod: bigint;
      active: boolean;
    } | undefined),
  })).filter((w) => w.owner && w.active);

  const isLoading = idsLoading || willsLoading;
  const hasWill = wills.length > 0;

  const refetch = () => {
    refetchIds();
    refetchWills();
  };

  return { wills, activeWillIds: activeWillIds || [], hasWill, isLoading, refetch };
}

// ─── V1 legacy hooks (kept for backward compatibility) ─────────────

export function useWill() {
  const { address } = useAccount();

  const { data: will, isLoading, refetch } = useReadContract({
    address: CRYPTO_WILL_ADDRESS,
    abi: CRYPTO_WILL_ABI,
    functionName: "getWill",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const hasWill = will && will.owner !== "0x0000000000000000000000000000000000000000" && will.active;

  return { will, hasWill, isLoading, refetch };
}

export function useSignAlive() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const signAlive = () => {
    writeContract({
      address: CRYPTO_WILL_ADDRESS,
      abi: CRYPTO_WILL_ABI,
      functionName: "signAlive",
    });
  };

  return { signAlive, isPending: isPending || isConfirming, isSuccess, hash };
}

export function useSignAliveV2() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Sign alive for all active wills (no-arg overload)
  const signAliveAll = () => {
    writeContract({
      address: CRYPTO_WILL_V2_ADDRESS,
      abi: CRYPTO_WILL_V2_ABI,
      functionName: "signAlive",
    });
  };

  // Sign alive for a specific will
  const signAliveSingle = (willId: bigint) => {
    writeContract({
      address: CRYPTO_WILL_V2_ADDRESS,
      abi: CRYPTO_WILL_V2_ABI,
      functionName: "signAlive",
      args: [willId],
    });
  };

  return { signAliveAll, signAliveSingle, isPending: isPending || isConfirming, isSuccess, hash };
}

export function useRevokeWill() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const revokeWill = () => {
    writeContract({
      address: CRYPTO_WILL_ADDRESS,
      abi: CRYPTO_WILL_ABI,
      functionName: "revokeWill",
    });
  };

  return { revokeWill, isPending: isPending || isConfirming, isSuccess, error, hash };
}

export function useRevokeWillV2() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const revokeWill = (willId: bigint) => {
    writeContract({
      address: CRYPTO_WILL_V2_ADDRESS,
      abi: CRYPTO_WILL_V2_ABI,
      functionName: "revokeWill",
      args: [willId],
    });
  };

  return { revokeWill, isPending: isPending || isConfirming, isSuccess, error, hash };
}

export function useEthBalance() {
  const { address } = useAccount();

  const { data: balance, refetch } = useReadContract({
    address: CRYPTO_WILL_ADDRESS,
    abi: CRYPTO_WILL_ABI,
    functionName: "ethBalances",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return { balance: balance ?? BigInt(0), refetch };
}

export function useEthBalanceV2(willId: bigint | undefined) {
  const { address } = useAccount();

  const { data: balance, refetch } = useReadContract({
    address: CRYPTO_WILL_V2_ADDRESS,
    abi: CRYPTO_WILL_V2_ABI,
    functionName: "ethBalances",
    args: address && willId !== undefined ? [address, willId] : undefined,
    query: { enabled: !!address && willId !== undefined },
  });

  return { balance: balance ?? BigInt(0), refetch };
}

export function useDepositETH() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const depositETH = (valueWei: bigint) => {
    writeContract({
      address: CRYPTO_WILL_ADDRESS,
      abi: CRYPTO_WILL_ABI,
      functionName: "depositETH",
      value: valueWei,
    });
  };

  return { depositETH, isPending: isPending || isConfirming, isSuccess, error };
}

export function useDepositETHV2() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const depositETH = (willId: bigint, valueWei: bigint) => {
    writeContract({
      address: CRYPTO_WILL_V2_ADDRESS,
      abi: CRYPTO_WILL_V2_ABI,
      functionName: "depositETH",
      args: [willId],
      value: valueWei,
    });
  };

  return { depositETH, isPending: isPending || isConfirming, isSuccess, error };
}

export function useUpdateBeneficiary() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const updateBeneficiary = (newBeneficiary: `0x${string}`) => {
    writeContract({
      address: CRYPTO_WILL_ADDRESS,
      abi: CRYPTO_WILL_ABI,
      functionName: "updateBeneficiary",
      args: [newBeneficiary],
    });
  };

  return { updateBeneficiary, isPending: isPending || isConfirming, isSuccess, error };
}

export function useUpdateBeneficiaryV2() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const updateBeneficiary = (willId: bigint, newBeneficiary: `0x${string}`) => {
    writeContract({
      address: CRYPTO_WILL_V2_ADDRESS,
      abi: CRYPTO_WILL_V2_ABI,
      functionName: "updateBeneficiary",
      args: [willId, newBeneficiary],
    });
  };

  return { updateBeneficiary, isPending: isPending || isConfirming, isSuccess, error };
}

export function useUpdateTokens() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const updateTokens = (newTokens: `0x${string}`[]) => {
    writeContract({
      address: CRYPTO_WILL_ADDRESS,
      abi: CRYPTO_WILL_ABI,
      functionName: "updateTokens",
      args: [newTokens],
    });
  };

  return { updateTokens, isPending: isPending || isConfirming, isSuccess, error };
}

export function useUpdateTokensV2() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const updateTokens = (willId: bigint, newTokens: `0x${string}`[]) => {
    writeContract({
      address: CRYPTO_WILL_V2_ADDRESS,
      abi: CRYPTO_WILL_V2_ABI,
      functionName: "updateTokens",
      args: [willId, newTokens],
    });
  };

  return { updateTokens, isPending: isPending || isConfirming, isSuccess, error };
}
