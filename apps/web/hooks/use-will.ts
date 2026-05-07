"use client";

import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CRYPTO_WILL_ABI, CRYPTO_WILL_ADDRESS } from "@/lib/contracts";

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

export function useRevokeWill() {
  const { writeContract, data: hash, isPending } = useWriteContract();

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

  return { revokeWill, isPending: isPending || isConfirming, isSuccess, hash };
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
