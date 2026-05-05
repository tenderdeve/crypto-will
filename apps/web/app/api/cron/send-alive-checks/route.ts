import { NextRequest, NextResponse } from "next/server";
import { getActiveWillsDueForCheck } from "@/lib/db/queries/wills";
import { createAliveCheck } from "@/lib/db/queries/alive-checks";
import { getUserByWallet } from "@/lib/db/queries/users";
import { sendAliveCheckEmail } from "@/lib/email/resend";
import { getSupabaseAdmin } from "@/lib/db/supabase";

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const wills = await getActiveWillsDueForCheck();

    let sent = 0;
    let failed = 0;

    for (const will of wills) {
      try {
        // Get user for email
        const supabase = getSupabaseAdmin();
        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("id", will.user_id)
          .single();

        if (!user?.email) {
          failed++;
          continue;
        }

        // Create alive check record
        const aliveCheck = await createAliveCheck(will.id);

        // Send email
        await sendAliveCheckEmail({
          to: user.email,
          ownerAddress: user.wallet_address,
          checkToken: aliveCheck.token,
          gracePeriodDays: will.grace_period_days,
        });

        // Update will status and next check date
        await supabase
          .from("wills")
          .update({
            status: "pending_check",
            next_check_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", will.id);

        sent++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: wills.length,
      sent,
      failed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
