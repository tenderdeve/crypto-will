"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CRYPTO_WILL_V2_ABI, CRYPTO_WILL_V2_ADDRESS } from "@/lib/contracts";

/**
 * Submit a guardian vote (execute or alive) for a specific will.
 */
export function useGuardianVote() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const voteToExecute = (owner: `0x${string}`, willId: bigint) => {
    writeContract({
      address: CRYPTO_WILL_V2_ADDRESS,
      abi: CRYPTO_WILL_V2_ABI,
      functionName: "voteToExecute",
      args: [owner, willId],
    });
  };

  const voteAlive = (owner: `0x${string}`, willId: bigint) => {
    writeContract({
      address: CRYPTO_WILL_V2_ADDRESS,
      abi: CRYPTO_WILL_V2_ABI,
      functionName: "voteAlive",
      args: [owner, willId],
    });
  };

  return {
    voteToExecute,
    voteAlive,
    isPending: isPending || isConfirming,
    isSuccess,
    hash,
    error,
  };
}
