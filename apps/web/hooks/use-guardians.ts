"use client";

import { useReadContract, useAccount } from "wagmi";
import { CRYPTO_WILL_V2_ABI, CRYPTO_WILL_V2_ADDRESS } from "@/lib/contracts";

/**
 * Read the guardian config and vote status for a specific will from the chain.
 */
export function useGuardians(ownerAddress?: `0x${string}`, willId?: bigint) {
  const { address } = useAccount();
  const owner = ownerAddress || address;

  const {
    data: guardianConfig,
    isLoading: configLoading,
    refetch: refetchConfig,
  } = useReadContract({
    address: CRYPTO_WILL_V2_ADDRESS,
    abi: CRYPTO_WILL_V2_ABI,
    functionName: "getGuardianConfig",
    args: owner && willId !== undefined ? [owner, willId] : undefined,
    query: { enabled: !!owner && willId !== undefined },
  });

  const {
    data: voteStatus,
    isLoading: voteLoading,
    refetch: refetchVotes,
  } = useReadContract({
    address: CRYPTO_WILL_V2_ADDRESS,
    abi: CRYPTO_WILL_V2_ABI,
    functionName: "getVoteStatus",
    args: owner && willId !== undefined ? [owner, willId] : undefined,
    query: { enabled: !!owner && willId !== undefined },
  });

  const {
    data: hasCurrentUserVoted,
    isLoading: votedLoading,
    refetch: refetchVoted,
  } = useReadContract({
    address: CRYPTO_WILL_V2_ADDRESS,
    abi: CRYPTO_WILL_V2_ABI,
    functionName: "hasVoted",
    args:
      owner && willId !== undefined && address
        ? [owner, willId, address]
        : undefined,
    query: { enabled: !!owner && willId !== undefined && !!address },
  });

  const guardians = guardianConfig?.guardians ?? [];
  const threshold = guardianConfig?.threshold ?? 0;
  const votingWindow = guardianConfig?.votingWindow ?? BigInt(0);
  const hasGuardians = guardians.length > 0;

  const votes = voteStatus?.[0] ?? BigInt(0);
  const requiredThreshold = voteStatus?.[1] ?? BigInt(0);
  const votingEndsAt = voteStatus?.[2] ?? BigInt(0);
  const votingActive = votingEndsAt > BigInt(0);

  const refetch = () => {
    refetchConfig();
    refetchVotes();
    refetchVoted();
  };

  return {
    guardians,
    threshold,
    votingWindow,
    hasGuardians,
    votes,
    requiredThreshold,
    votingEndsAt,
    votingActive,
    hasCurrentUserVoted: hasCurrentUserVoted ?? false,
    isLoading: configLoading || voteLoading || votedLoading,
    refetch,
  };
}
