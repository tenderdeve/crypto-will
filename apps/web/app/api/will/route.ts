import { NextRequest, NextResponse } from "next/server";
import { createWillSchema } from "@/lib/validations/schemas";
import { createWill, getWillByUserId } from "@/lib/db/queries/wills";
import { getUserByWallet } from "@/lib/db/queries/users";

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

    const user = await getUserByWallet(walletAddress.toLowerCase());
    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const will = await createWill({
      userId: user.id,
      beneficiaryAddress: parsed.data.beneficiaryAddress,
      tokenAddresses: parsed.data.tokenAddresses,
      contractTxHash: parsed.data.contractTxHash,
      gracePeriodDays: parsed.data.gracePeriodDays,
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
