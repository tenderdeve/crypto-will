"use client";

import { useState, useEffect, useCallback } from "react";
import { Check } from "lucide-react";
import { useNFTApproval } from "@/hooks/use-nft-approval";
import { useWalletNFTs, type NFTInfo } from "@/hooks/use-wallet-nfts";

// ─── Types ──────────────────────────────────────────────────────────

export interface SelectedNFT {
  contractAddress: `0x${string}`;
  tokenId: string;
  amount: number;
  nftType: "erc721" | "erc1155";
  name: string;
  imageUrl: string;
}

// ─── NFT Approval Row ───────────────────────────────────────────────

function NFTApprovalBadge({
  contractAddress,
  nftType,
  onApprovalChange,
}: {
  contractAddress: `0x${string}`;
  nftType: "erc721" | "erc1155";
  onApprovalChange: (addr: string, approved: boolean) => void;
}) {
  const { isApproved, approve, isPending, error } = useNFTApproval(
    contractAddress,
    nftType
  );

  useEffect(() => {
    onApprovalChange(contractAddress, isApproved);
  }, [contractAddress, isApproved, onApprovalChange]);

  if (isApproved) {
    return (
      <span className="text-xs text-good inline-flex items-center gap-1.5">
        <Check className="w-3.5 h-3.5" /> Approved
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          approve();
        }}
        disabled={isPending}
        className="rounded-pill bg-ink text-paper px-3.5 py-2 text-[13px] font-medium cursor-pointer border-none disabled:opacity-50"
      >
        {isPending ? "Confirm..." : "Approve All"}
      </button>
      {error && (
        <div className="text-xs text-danger mt-1">
          {error.message.slice(0, 100)}
        </div>
      )}
    </div>
  );
}

// ─── NFT Card ───────────────────────────────────────────────────────

function NFTCard({
  nft,
  selected,
  onToggle,
}: {
  nft: NFTInfo;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={`relative rounded-cards border cursor-pointer transition-all overflow-hidden ${
        selected
          ? "border-accent ring-1 ring-accent/30"
          : "border-line hover:border-ink/30"
      }`}
    >
      {/* Image */}
      <div className="aspect-square bg-bg-2 flex items-center justify-center overflow-hidden">
        {nft.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={nft.imageUrl}
            alt={nft.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-3xl text-ink-3 font-bold">?</div>
        )}
      </div>
      {/* Info */}
      <div className="px-3 py-2.5">
        <div className="text-[13px] font-medium truncate">{nft.name}</div>
        <div className="text-[11px] text-ink-3 mono">
          {nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)}
        </div>
        <div className="text-[10px] text-ink-3 uppercase mt-0.5">
          {nft.tokenType === "erc721" ? "ERC-721" : `ERC-1155 x${nft.balance}`}
        </div>
      </div>
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}
    </div>
  );
}

// ─── Main Selector ──────────────────────────────────────────────────

export function NFTSelector({
  selectedNFTs,
  onSelectionChange,
  onApprovalChange,
}: {
  selectedNFTs: SelectedNFT[];
  onSelectionChange: (nfts: SelectedNFT[]) => void;
  onApprovalChange: (addr: string, approved: boolean) => void;
}) {
  const { nfts: walletNFTs, isLoading } = useWalletNFTs();
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({});

  const nftKey = (nft: NFTInfo) =>
    `${nft.contractAddress}-${nft.tokenId}`;

  const isSelected = (nft: NFTInfo) =>
    selectedNFTs.some(
      (s) =>
        s.contractAddress.toLowerCase() ===
          nft.contractAddress.toLowerCase() && s.tokenId === nft.tokenId
    );

  const toggleNFT = (nft: NFTInfo) => {
    if (isSelected(nft)) {
      onSelectionChange(
        selectedNFTs.filter(
          (s) =>
            !(
              s.contractAddress.toLowerCase() ===
                nft.contractAddress.toLowerCase() &&
              s.tokenId === nft.tokenId
            )
        )
      );
    } else {
      if (selectedNFTs.length >= 20) return; // MAX_NFTS
      onSelectionChange([
        ...selectedNFTs,
        {
          contractAddress: nft.contractAddress,
          tokenId: nft.tokenId,
          amount: nft.tokenType === "erc1155" ? nft.balance : 1,
          nftType: nft.tokenType,
          name: nft.name,
          imageUrl: nft.imageUrl,
        },
      ]);
    }
  };

  const updateAmount = useCallback(
    (contractAddress: string, tokenId: string, amount: number) => {
      onSelectionChange(
        selectedNFTs.map((s) =>
          s.contractAddress.toLowerCase() === contractAddress.toLowerCase() &&
          s.tokenId === tokenId
            ? { ...s, amount }
            : s
        )
      );
    },
    [selectedNFTs, onSelectionChange]
  );

  // Get unique contract addresses from selected NFTs that need approval
  const uniqueContracts = Array.from(
    new Map(
      selectedNFTs.map((nft) => [
        nft.contractAddress.toLowerCase(),
        { address: nft.contractAddress, nftType: nft.nftType },
      ])
    ).values()
  );

  return (
    <div>
      {/* Detection header */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-[13px] text-ink-2 font-medium">
          NFTs in your wallet
        </div>
        <div className="text-xs text-ink-3">
          {selectedNFTs.length}/20 selected
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-ink-3 text-center py-8">
          Detecting NFTs in your wallet...
        </div>
      )}

      {!isLoading && walletNFTs.length === 0 && (
        <div className="text-sm text-ink-3 text-center py-8 bg-paper border border-line rounded-cards">
          No NFTs detected in your wallet. NFTs are optional — you can create a
          will with just ERC-20 tokens.
        </div>
      )}

      {/* NFT grid */}
      {!isLoading && walletNFTs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
          {walletNFTs.map((nft) => (
            <NFTCard
              key={nftKey(nft)}
              nft={nft}
              selected={isSelected(nft)}
              onToggle={() => toggleNFT(nft)}
            />
          ))}
        </div>
      )}

      {/* Selected NFTs with amounts (for ERC-1155) */}
      {selectedNFTs.some((n) => n.nftType === "erc1155") && (
        <div className="mt-4 bg-paper border border-line rounded-cards p-4">
          <div className="text-[13px] text-ink-2 font-medium mb-3">
            ERC-1155 quantities
          </div>
          {selectedNFTs
            .filter((n) => n.nftType === "erc1155")
            .map((nft) => {
              const key = `${nft.contractAddress}-${nft.tokenId}`;
              const walletNft = walletNFTs.find(
                (w) =>
                  w.contractAddress.toLowerCase() ===
                    nft.contractAddress.toLowerCase() &&
                  w.tokenId === nft.tokenId
              );
              const maxAmount = walletNft?.balance || nft.amount;
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 py-2 border-b border-line-2 last:border-0"
                >
                  <div className="flex-1 text-sm truncate">
                    {nft.name}{" "}
                    <span className="text-ink-3 text-xs">
                      (max: {maxAmount})
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={maxAmount}
                    value={amountInputs[key] ?? nft.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAmountInputs((prev) => ({ ...prev, [key]: val }));
                      const num = parseInt(val);
                      if (!isNaN(num) && num >= 1 && num <= maxAmount) {
                        updateAmount(
                          nft.contractAddress,
                          nft.tokenId,
                          num
                        );
                      }
                    }}
                    className="w-20 px-2 py-1.5 rounded-inputs border border-line text-sm text-center"
                  />
                </div>
              );
            })}
        </div>
      )}

      {/* Approvals */}
      {uniqueContracts.length > 0 && (
        <div className="mt-4 bg-paper border border-line rounded-cards p-4">
          <div className="text-[13px] text-ink-2 font-medium mb-3">
            NFT contract approvals
          </div>
          <div className="text-xs text-ink-3 mb-3">
            Each NFT contract needs a one-time setApprovalForAll so the will
            contract can transfer on execution.
          </div>
          {uniqueContracts.map((c) => (
            <div
              key={c.address}
              className="flex items-center justify-between py-2 border-b border-line-2 last:border-0"
            >
              <div className="mono text-[12px] text-ink-2">
                {c.address.slice(0, 8)}...{c.address.slice(-6)}{" "}
                <span className="text-ink-3 uppercase text-[10px]">
                  {c.nftType === "erc721" ? "ERC-721" : "ERC-1155"}
                </span>
              </div>
              <NFTApprovalBadge
                contractAddress={c.address as `0x${string}`}
                nftType={c.nftType}
                onApprovalChange={onApprovalChange}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
