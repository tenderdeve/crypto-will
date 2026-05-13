"use client";

interface NFTItem {
  contractAddr: string;
  tokenId: bigint;
  amount: bigint;
  nftType: number; // 0 = ERC721, 1 = ERC1155
}

export function NFTsCard({ nfts }: { nfts: NFTItem[] }) {
  if (!nfts || nfts.length === 0) return null;

  return (
    <div className="rounded-cards border border-line bg-paper p-6 mt-6">
      <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3 mb-4">
        NFTs in this will
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {nfts.map((nft, i) => (
          <div
            key={`${nft.contractAddr}-${nft.tokenId.toString()}-${i}`}
            className="rounded-cards border border-line overflow-hidden"
          >
            {/* Placeholder image */}
            <div className="aspect-square bg-bg-2 flex items-center justify-center">
              <div className="text-2xl text-ink-3 font-bold">
                {nft.nftType === 0 ? "721" : "1155"}
              </div>
            </div>
            <div className="px-3 py-2.5">
              <div className="mono text-[11px] text-ink-2 truncate">
                {nft.contractAddr.slice(0, 6)}...{nft.contractAddr.slice(-4)}
              </div>
              <div className="text-[12px] text-ink font-medium mt-0.5">
                #{nft.tokenId.toString()}
              </div>
              <div className="text-[10px] text-ink-3 uppercase mt-0.5">
                {nft.nftType === 0
                  ? "ERC-721"
                  : `ERC-1155 x${nft.amount.toString()}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
