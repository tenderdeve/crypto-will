import { NextRequest, NextResponse } from "next/server";
import { getWillById, updateWillStatus } from "@/lib/db/queries/wills";
import { getUserByWallet } from "@/lib/db/queries/users";

async function resolveOwner(request: NextRequest, willId: string) {
  const walletAddress = request.headers.get("x-wallet-address");
  if (!walletAddress) return { error: "Missing wallet address", status: 401 };

  const will = await getWillById(willId);
  if (!will) return { error: "Will not found", status: 404 };

  const user = await getUserByWallet(walletAddress.toLowerCase());
  if (!user || user.id !== will.user_id) return { error: "Forbidden", status: 403 };

  return { will, user };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await resolveOwner(request, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ will: result.will });
  } catch {
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await resolveOwner(request, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    if (body.status) {
      await updateWillStatus(id, body.status);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await resolveOwner(request, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await updateWillStatus(id, "revoked");
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
