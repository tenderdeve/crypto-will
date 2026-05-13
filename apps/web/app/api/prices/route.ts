import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTokenPrices } from "@/lib/prices/coingecko";

const pricesRequestSchema = z.object({
  tokenAddresses: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).max(100),
  chainId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = pricesRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { tokenAddresses, chainId } = parsed.data;
    const prices = await getTokenPrices(tokenAddresses, chainId);

    return NextResponse.json({ prices });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch prices", code: "PRICE_FETCH_ERROR" },
      { status: 500 }
    );
  }
}
