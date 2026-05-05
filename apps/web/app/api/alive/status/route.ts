import { NextRequest, NextResponse } from "next/server";
import { getAliveChecksByWillId } from "@/lib/db/queries/alive-checks";

export async function GET(request: NextRequest) {
  try {
    const willId = request.nextUrl.searchParams.get("willId");

    if (!willId) {
      return NextResponse.json(
        { error: "Missing willId parameter", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const checks = await getAliveChecksByWillId(willId);

    return NextResponse.json({ checks });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
