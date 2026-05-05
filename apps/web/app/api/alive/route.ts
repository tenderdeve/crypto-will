import { NextRequest, NextResponse } from "next/server";
import { getWillById, updateWillAlive } from "@/lib/db/queries/wills";
import { confirmAliveCheck, getAliveCheckByToken, getAliveChecksByWillId } from "@/lib/db/queries/alive-checks";
import { z } from "zod";

const aliveCheckBodySchema = z.union([
  z.object({ signature: z.string().min(1), willId: z.string().uuid() }),
  z.object({ signature: z.string().min(1), token: z.string().min(1) }),
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = aliveCheckBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { signature } = parsed.data;
    let willId: string;
    let aliveCheckId: string | undefined;

    // Support both willId-based and token-based lookups
    if ("token" in parsed.data) {
      const aliveCheck = await getAliveCheckByToken(parsed.data.token);
      if (!aliveCheck) {
        return NextResponse.json(
          { error: "Invalid or expired check token", code: "TOKEN_INVALID" },
          { status: 404 }
        );
      }
      willId = aliveCheck.will_id;
      aliveCheckId = aliveCheck.id;
    } else {
      willId = parsed.data.willId;
    }

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

    // Confirm the alive check record
    if (aliveCheckId) {
      await confirmAliveCheck(aliveCheckId, signature);
    } else {
      const checks = await getAliveChecksByWillId(willId);
      const pendingCheck = checks.find((c) => c.status === "sent");
      if (pendingCheck) {
        await confirmAliveCheck(pendingCheck.id, signature);
      }
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
