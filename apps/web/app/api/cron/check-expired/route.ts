import { NextRequest, NextResponse } from "next/server";
import { getExpiredWills, updateWillStatus } from "@/lib/db/queries/wills";
import { getPublicClient, getWalletClient } from "@/lib/chain/client";
import { CRYPTO_WILL_ABI, CRYPTO_WILL_ADDRESS } from "@/lib/chain/contracts";
import { sendWillExecutedEmail } from "@/lib/email/resend";
import { getSupabaseAdmin } from "@/lib/db/supabase";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const expiredWills = await getExpiredWills();

    let executed = 0;
    let failed = 0;

    for (const will of expiredWills) {
      try {
        // Get user's wallet address
        const supabase = getSupabaseAdmin();
        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("id", will.user_id)
          .single();

        if (!user) {
          failed++;
          continue;
        }

        // Verify on-chain that grace period has expired
        const publicClient = getPublicClient();
        const onChainWill = await publicClient.readContract({
          address: CRYPTO_WILL_ADDRESS,
          abi: CRYPTO_WILL_ABI,
          functionName: "getWill",
          args: [user.wallet_address as `0x${string}`],
        });

        if (!onChainWill.active) {
          // Already executed or revoked on-chain
          await updateWillStatus(will.id, "executed");
          executed++;
          continue;
        }

        // Execute will on-chain
        const walletClient = getWalletClient();
        const hash = await walletClient.writeContract({
          address: CRYPTO_WILL_ADDRESS,
          abi: CRYPTO_WILL_ABI,
          functionName: "executeWill",
          args: [user.wallet_address as `0x${string}`],
        });

        // Wait for confirmation
        await publicClient.waitForTransactionReceipt({ hash });

        // Update DB status
        await updateWillStatus(will.id, "executed");

        // Notify via email (best effort)
        if (user.email) {
          await sendWillExecutedEmail({
            to: user.email,
            beneficiaryAddress: will.beneficiary_address,
            ownerAddress: user.wallet_address,
            tokenCount: will.token_addresses.length,
          }).catch(() => {}); // Don't fail on email error
        }

        executed++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: expiredWills.length,
      executed,
      failed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
