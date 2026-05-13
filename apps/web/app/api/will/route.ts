import { NextRequest, NextResponse } from "next/server";
import { createWillSchema } from "@/lib/validations/schemas";
import { createWill, getWillByUserId } from "@/lib/db/queries/wills";
import { getUserByWallet, createUser, updateUserEmail } from "@/lib/db/queries/users";
import { getPublicClient } from "@/lib/chain/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createWillSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const walletAddress = request.headers.get("x-wallet-address");
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing wallet address", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    // Verify wallet ownership: confirm the tx was sent by the claimed wallet address
    try {
      const publicClient = getPublicClient();
      const tx = await publicClient.getTransaction({
        hash: parsed.data.contractTxHash as `0x${string}`,
      });
      if (tx.from.toLowerCase() !== walletAddress.toLowerCase()) {
        return NextResponse.json(
          { error: "Wallet address does not match transaction sender", code: "AUTH_FAILED" },
          { status: 401 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Could not verify transaction on-chain", code: "TX_NOT_FOUND" },
        { status: 400 }
      );
    }

    // Upsert user — create if not found, update email if provided and missing
    let user = await getUserByWallet(walletAddress.toLowerCase());
    if (!user) {
      user = await createUser(walletAddress.toLowerCase(), parsed.data.email);
    } else if (parsed.data.email && !user.email) {
      await updateUserEmail(user.id, parsed.data.email);
      user = { ...user, email: parsed.data.email };
    }

    const will = await createWill({
      userId: user.id,
      beneficiaryAddress: parsed.data.beneficiaryAddress,
      tokenAddresses: parsed.data.tokenAddresses,
      contractTxHash: parsed.data.contractTxHash,
      gracePeriodDays: parsed.data.gracePeriodDays,
      beneficiaryEmail: parsed.data.beneficiaryEmail,
    });

    return NextResponse.json({ will }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get("x-wallet-address");
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing wallet address", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const user = await getUserByWallet(walletAddress.toLowerCase());
    if (!user) {
      return NextResponse.json({ wills: [] });
    }

    const will = await getWillByUserId(user.id);
    return NextResponse.json({ wills: will ? [will] : [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
