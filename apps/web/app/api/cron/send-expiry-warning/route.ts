import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { sendExpiryWarningEmail } from "@/lib/email/resend";
import type { Will } from "@/lib/db/types";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get all active wills
    const { data: wills, error } = await supabase
      .from("wills")
      .select("*")
      .in("status", ["active", "pending_check"]);

    if (error) throw new Error(`Failed to query wills: ${error.message}`);

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Filter: wills expiring within 7 days
    const expiringWills = ((wills || []) as Will[]).filter((w) => {
      const lastAlive = new Date(w.last_alive_at).getTime();
      const graceMs = w.grace_period_days * 24 * 60 * 60 * 1000;
      const expiresAt = lastAlive + graceMs;
      const timeLeft = expiresAt - now;
      return timeLeft > 0 && timeLeft <= SEVEN_DAYS_MS;
    });

    let sent = 0;
    let failed = 0;

    for (const will of expiringWills) {
      try {
        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("id", will.user_id)
          .single();

        if (!user?.email) {
          failed++;
          continue;
        }

        const lastAlive = new Date(will.last_alive_at).getTime();
        const graceMs = will.grace_period_days * 24 * 60 * 60 * 1000;
        const expiresAt = lastAlive + graceMs;
        const daysLeft = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));

        await sendExpiryWarningEmail({
          to: user.email,
          ownerAddress: user.wallet_address,
          daysLeft,
          beneficiaryAddress: will.beneficiary_address,
        });

        sent++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: expiringWills.length,
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
