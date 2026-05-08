import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase";

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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Mark stale alive checks as expired
    const { data, error } = await supabase
      .from("alive_checks")
      .update({ status: "expired" })
      .eq("status", "sent")
      .lt("sent_at", thirtyDaysAgo)
      .select();

    if (error) throw new Error(`Failed to cleanup checks: ${error.message}`);

    return NextResponse.json({
      success: true,
      expired: data?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
