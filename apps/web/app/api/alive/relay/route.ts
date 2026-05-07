import { NextRequest, NextResponse } from "next/server";
import { verifyTypedData } from "viem";
import { getPublicClient, getWalletClient } from "@/lib/chain/client";
import { CRYPTO_WILL_ABI } from "@/lib/contracts";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "8453");
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

const domain = {
  name: "ChainWill" as const,
  version: "1" as const,
  chainId: CHAIN_ID,
  verifyingContract: CONTRACT_ADDRESS,
};

const types = {
  AliveProof: [
    { name: "owner", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "issuedAt", type: "uint256" },
  ],
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, nonce, issuedAt, signature } = body;

    if (!owner || nonce === undefined || !issuedAt || !signature) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const message = {
      owner: owner as `0x${string}`,
      nonce: BigInt(nonce),
      issuedAt: BigInt(issuedAt),
    };

    // Verify the EIP-712 signature server-side
    const valid = await verifyTypedData({
      address: owner as `0x${string}`,
      domain,
      types,
      primaryType: "AliveProof",
      message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Submit the proof on-chain via the relayer wallet
    const walletClient = getWalletClient();
    const publicClient = getPublicClient();

    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: CRYPTO_WILL_ABI,
      functionName: "signAliveBySig",
      args: [
        owner as `0x${string}`,
        BigInt(nonce),
        BigInt(issuedAt),
        signature as `0x${string}`,
      ],
    });

    // Wait for tx confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: Number(receipt.blockNumber),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Relay failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
