"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CRYPTO_WILL_ABI, CRYPTO_WILL_ADDRESS } from "@/lib/contracts";

export function useCreateWill() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createWill = (
    beneficiary: `0x${string}`,
    tokens: `0x${string}`[],
    gracePeriodSeconds: bigint
  ) => {
    writeContract({
      address: CRYPTO_WILL_ADDRESS,
      abi: CRYPTO_WILL_ABI,
      functionName: "createWill",
      args: [beneficiary, tokens, gracePeriodSeconds],
    });
  };

  return {
    createWill,
    isPending: isPending || isConfirming,
    isSuccess,
    hash,
    error,
  };
}
