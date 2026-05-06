import { NextRequest, NextResponse } from "next/server";
import { getWillById, getWillByUserId, updateWillAlive } from "@/lib/db/queries/wills";
import { confirmAliveCheck, getAliveCheckByToken, getAliveChecksByWillId } from "@/lib/db/queries/alive-checks";
import { getUserByWallet } from "@/lib/db/queries/users";
import { getPublicClient } from "@/lib/chain/client";
import { z } from "zod";

const txHash = z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid tx hash");

const aliveCheckBodySchema = z.union([
  // Email link flow: token from the email link, txHash as proof (on-chain signAlive called)
  z.object({ token: z.string().min(1), txHash }),
  // Dashboard flow: txHash proves wallet identity (on-chain signAlive already called)
  z.object({ source: z.literal("dashboard"), txHash }),
  // Legacy: signature + willId
  z.object({ signature: z.string().min(1), willId: z.string().uuid() }),
]);

async function verifyTxSender(hash: string, expectedAddress: string): Promise<boolean> {
  try {
    const publicClient = getPublicClient();
    const tx = await publicClient.getTransaction({ hash: hash as `0x${string}` });
    return tx.from.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

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
    let ownerAddress: string | undefined;

    if ("token" in parsed.data) {
      // Email link: look up the alive_check by token (only status=sent, prevents replay)
      const aliveCheck = await getAliveCheckByToken(parsed.data.token);
      if (!aliveCheck) {
        return NextResponse.json(
          { error: "Invalid or expired check token", code: "TOKEN_INVALID" },
          { status: 404 }
        );
      }
      willId = aliveCheck.will_id;
      aliveCheckId = aliveCheck.id;

      // Resolve owner address for tx verification
      const will = await getWillById(willId);
      if (will) {
        const user = await getUserByWallet(will.user_id); // user_id is the wallet address in some schemas
        // Get owner address from will owner via users table — fetch will's user
        // We use wallet_address from DB to verify the tx was sent by the will owner
        const { data: userData } = await (await import("@/lib/db/supabase")).getSupabaseAdmin()
          .from("users")
          .select("wallet_address")
          .eq("id", will.user_id)
          .single();
        ownerAddress = userData?.wallet_address;
      }
    } else if ("source" in parsed.data && parsed.data.source === "dashboard") {
      // Dashboard: x-wallet-address header is the claimed identity, txHash verifies it
      const walletAddress = request.headers.get("x-wallet-address");
      if (!walletAddress) {
        return NextResponse.json(
          { error: "Missing wallet address", code: "AUTH_REQUIRED" },
          { status: 401 }
        );
      }

      // Verify tx was sent by the claimed wallet
      const isValid = await verifyTxSender(parsed.data.txHash, walletAddress);
      if (!isValid) {
        return NextResponse.json(
          { error: "Transaction not sent by claimed wallet", code: "AUTH_FAILED" },
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
      ownerAddress = walletAddress;
    } else {
      // Legacy willId-based
      willId = (parsed.data as { willId: string }).willId;
    }

    // For token-based flow, verify tx sender matches will owner
    if ("token" in parsed.data && ownerAddress) {
      const isValid = await verifyTxSender(parsed.data.txHash, ownerAddress);
      if (!isValid) {
        return NextResponse.json(
          { error: "Transaction not sent by will owner", code: "AUTH_FAILED" },
          { status: 401 }
        );
      }
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

    // Confirm any pending alive check record (null signature — on-chain tx is the proof)
    if (aliveCheckId) {
      await confirmAliveCheck(aliveCheckId, null);
    } else {
      const checks = await getAliveChecksByWillId(willId);
      const pendingCheck = checks.find((c) => c.status === "sent");
      if (pendingCheck) {
        await confirmAliveCheck(pendingCheck.id, null);
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
