import { NextRequest, NextResponse } from "next/server";
import { getWillById, getWillByUserId, updateWillAlive } from "@/lib/db/queries/wills";
import { confirmAliveCheck, getAliveCheckByToken, getAliveChecksByWillId } from "@/lib/db/queries/alive-checks";
import { getUserByWallet } from "@/lib/db/queries/users";
import { z } from "zod";

const aliveCheckBodySchema = z.union([
  // Email link flow: token from the email link (on-chain signAlive already called)
  z.object({ token: z.string().min(1) }),
  // Dashboard flow: on-chain signAlive already called, sync DB via wallet header
  z.object({ source: z.literal("dashboard") }),
  // Legacy: signature + willId
  z.object({ signature: z.string().min(1), willId: z.string().uuid() }),
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

    let willId: string;
    let aliveCheckId: string | undefined;

    if ("token" in parsed.data) {
      // Email link: look up the alive_check by token
      const aliveCheck = await getAliveCheckByToken(parsed.data.token);
      if (!aliveCheck) {
        return NextResponse.json(
          { error: "Invalid or expired check token", code: "TOKEN_INVALID" },
          { status: 404 }
        );
      }
      willId = aliveCheck.will_id;
      aliveCheckId = aliveCheck.id;
    } else if ("source" in parsed.data && parsed.data.source === "dashboard") {
      // Dashboard: resolve will from x-wallet-address header
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
      const will = await getWillByUserId(user.id);
      if (!will) {
        return NextResponse.json(
          { error: "Will not found", code: "NOT_FOUND" },
          { status: 404 }
        );
      }
      willId = will.id;
    } else {
      // Legacy willId-based
      willId = (parsed.data as { willId: string }).willId;
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

    // Confirm any pending alive check record
    if (aliveCheckId) {
      await confirmAliveCheck(aliveCheckId, "");
    } else {
      const checks = await getAliveChecksByWillId(willId);
      const pendingCheck = checks.find((c) => c.status === "sent");
      if (pendingCheck) {
        await confirmAliveCheck(pendingCheck.id, "");
      }
    }

    await updateWillAlive(willId);

    return NextResponse.json({ success: true, message: "Alive check confirmed" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
