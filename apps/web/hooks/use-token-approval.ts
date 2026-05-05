"use client";

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { ERC20_ABI, CRYPTO_WILL_ADDRESS } from "@/lib/contracts";
import { maxUint256 } from "viem";

export function useTokenApproval(tokenAddress: `0x${string}`) {
  const { address } = useAccount();

  const { data: allowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CRYPTO_WILL_ADDRESS] : undefined,
    query: { enabled: !!address && !!tokenAddress },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const isApproved = allowance ? allowance > BigInt(0) : false;

  const approve = () => {
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CRYPTO_WILL_ADDRESS, maxUint256],
    });
  };

  return {
    isApproved,
    approve,
    isPending: isPending || isConfirming,
    isSuccess,
    hash,
  };
}
