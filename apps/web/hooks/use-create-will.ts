"use client";

import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { decodeEventLog } from "viem";
import { useState, useEffect } from "react";
import { CRYPTO_WILL_V2_ABI, CRYPTO_WILL_V2_ADDRESS } from "@/lib/contracts";

export function useCreateWill() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const publicClient = usePublicClient();
  const [willId, setWillId] = useState<bigint | undefined>(undefined);

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Extract willId from WillCreated event log once tx is confirmed
  useEffect(() => {
    if (!isSuccess || !hash || !publicClient) return;

    publicClient.getTransactionReceipt({ hash }).then((receipt) => {
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: CRYPTO_WILL_V2_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "WillCreated") {
            const args = decoded.args as { willId: bigint };
            setWillId(args.willId);
            break;
          }
        } catch {
          // Not a matching event, skip
        }
      }
    }).catch(() => {});
  }, [isSuccess, hash, publicClient]);

  const createWill = (
    beneficiary: `0x${string}`,
    tokens: `0x${string}`[],
    gracePeriodSeconds: bigint
  ) => {
    writeContract({
      address: CRYPTO_WILL_V2_ADDRESS,
      abi: CRYPTO_WILL_V2_ABI,
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
    willId,
  };
}
