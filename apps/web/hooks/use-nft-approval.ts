"use client";

import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { ERC721_ABI, ERC1155_ABI, CRYPTO_WILL_V2_ADDRESS } from "@/lib/contracts";

/**
 * Check and manage `setApprovalForAll` for an NFT contract (ERC-721 or ERC-1155).
 * Both standards use the same isApprovedForAll / setApprovalForAll interface.
 */
export function useNFTApproval(
  contractAddress: `0x${string}`,
  nftType: "erc721" | "erc1155"
) {
  const { address } = useAccount();
  const abi = nftType === "erc721" ? ERC721_ABI : ERC1155_ABI;

  const { data: isApprovedForAll } = useReadContract({
    address: contractAddress,
    abi,
    functionName: "isApprovedForAll",
    args: address ? [address, CRYPTO_WILL_V2_ADDRESS] : undefined,
    query: {
      enabled: !!address && !!contractAddress,
      refetchInterval: 2000,
    },
  });

  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash });

  const isApproved = isApprovedForAll === true;

  const approve = () => {
    writeContract({
      address: contractAddress,
      abi,
      functionName: "setApprovalForAll",
      args: [CRYPTO_WILL_V2_ADDRESS, true],
    });
  };

  return {
    isApproved,
    approve,
    isPending: isPending || isConfirming,
    isSuccess,
    error: writeError,
    hash,
  };
}
