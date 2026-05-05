import { NextRequest, NextResponse } from "next/server";
import { aliveCheckSchema } from "@/lib/validations/schemas";
import { getWillById, updateWillAlive } from "@/lib/db/queries/wills";
import { confirmAliveCheck, getAliveChecksByWillId } from "@/lib/db/queries/alive-checks";
import { verifyMessage } from "viem";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = aliveCheckSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { signature, willId } = parsed.data;

    const will = await getWillById(willId);
    if (!will) {
      return NextResponse.json(
        { error: "Will not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (will.status !== "active" && will.status !== "pending_check") {
      return NextResponse.json(
        { error: "Will is not active", code: "WILL_INACTIVE" },
        { status: 400 }
      );
    }

    // Find latest pending alive check for this will
    const checks = await getAliveChecksByWillId(willId);
    const pendingCheck = checks.find((c) => c.status === "sent");

    if (pendingCheck) {
      await confirmAliveCheck(pendingCheck.id, signature);
    }

    // Update will's last alive timestamp
    await updateWillAlive(willId);

    return NextResponse.json({ success: true, message: "Alive check confirmed" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
