import { NextRequest, NextResponse } from "next/server";
import { walletAuthSchema } from "@/lib/validations/schemas";
import { verifySIWE } from "@/lib/auth/siwe";
import { getUserByWallet, createUser } from "@/lib/db/queries/users";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = walletAuthSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { message, signature } = parsed.data;
    const { address, success } = await verifySIWE(message, signature);

    if (!success) {
      return NextResponse.json(
        { error: "Invalid signature", code: "AUTH_FAILED" },
        { status: 401 }
      );
    }

    let user = await getUserByWallet(address);
    if (!user) {
      user = await createUser(address);
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
