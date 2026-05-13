"use client";

import { useAccount } from "wagmi";
import { useState, useEffect } from "react";

export interface NFTInfo {
  contractAddress: `0x${string}`;
  tokenId: string;
  name: string;
  imageUrl: string;
  tokenType: "erc721" | "erc1155";
  balance: number; // 1 for ERC-721, quantity for ERC-1155
}

/**
 * Fetches the user's NFTs via Alchemy getNFTsForOwner API.
 * Falls back to empty array on local dev or if Alchemy URL is not set.
 */
export function useWalletNFTs() {
  const { address, chainId } = useAccount();
  const [nfts, setNfts] = useState<NFTInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    async function fetchNFTs() {
      setIsLoading(true);
      try {
        const isLocal = chainId === 31337 || chainId === 1337;
        if (isLocal) {
          setNfts([]);
          setIsLoading(false);
          return;
        }

        const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_URL;
        if (!rpcUrl) {
          setNfts([]);
          setIsLoading(false);
          return;
        }

        // Derive Alchemy REST URL from RPC URL
        // e.g. https://base-sepolia.g.alchemy.com/v2/KEY -> https://base-sepolia.g.alchemy.com/nft/v3/KEY/getNFTsForOwner
        const urlParts = rpcUrl.match(/^(https?:\/\/[^/]+)\/v2\/(.+)$/);
        if (!urlParts) {
          setNfts([]);
          setIsLoading(false);
          return;
        }

        const [, baseUrl, apiKey] = urlParts;
        const nftUrl = `${baseUrl}/nft/v3/${apiKey}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=50`;

        const response = await fetch(nftUrl);
        const data = await response.json();

        if (data.ownedNfts) {
          const parsed: NFTInfo[] = data.ownedNfts
            .filter(
              (nft: { tokenType: string }) =>
                nft.tokenType === "ERC721" || nft.tokenType === "ERC1155"
            )
            .map(
              (nft: {
                contract: { address: string };
                tokenId: string;
                name?: string;
                image?: { cachedUrl?: string; originalUrl?: string };
                tokenType: string;
                balance?: string;
              }) => ({
                contractAddress: nft.contract.address as `0x${string}`,
                tokenId: nft.tokenId,
                name: nft.name || `#${nft.tokenId}`,
                imageUrl:
                  nft.image?.cachedUrl || nft.image?.originalUrl || "",
                tokenType:
                  nft.tokenType === "ERC721" ? "erc721" : "erc1155",
                balance: nft.balance ? parseInt(nft.balance) : 1,
              })
            );
          setNfts(parsed);
        } else {
          setNfts([]);
        }
      } catch {
        setNfts([]);
      }
      setIsLoading(false);
    }

    fetchNFTs();
  }, [address, chainId]);

  return { nfts, isLoading };
}
