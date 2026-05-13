import { NextRequest, NextResponse } from "next/server";
import { getWillById } from "@/lib/db/queries/wills";
import { getUserByWallet } from "@/lib/db/queries/users";
import {
  createSealedLetter,
  getSealedLetterByWillId,
  updateSealedLetter,
} from "@/lib/db/queries/sealed-letters";
import { sealedLetterSchema } from "@/lib/validations/schemas";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/will/[id]/sealed-letter
 *
 * Returns the encrypted letter for a will.
 * - Owner: can access any time
 * - Beneficiary: can only access when will status = "executed"
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: "Invalid will ID", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const walletAddress = request.headers.get("x-wallet-address");
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing wallet address", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const will = await getWillById(id);
    if (!will) {
      return NextResponse.json(
        { error: "Will not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Determine caller role
    const user = await getUserByWallet(walletAddress.toLowerCase());
    const isOwner = user && user.id === will.user_id;
    const isBeneficiary =
      walletAddress.toLowerCase() === will.beneficiary_address.toLowerCase();

    if (!isOwner && !isBeneficiary) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Beneficiary can only read after will is executed
    if (isBeneficiary && !isOwner && will.status !== "executed") {
      return NextResponse.json(
        { error: "Will has not been executed yet", code: "NOT_EXECUTED" },
        { status: 403 }
      );
    }

    const letter = await getSealedLetterByWillId(id);
    if (!letter) {
      return NextResponse.json(
        { error: "No sealed letter found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ letter });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/will/[id]/sealed-letter
 *
 * Create or update a sealed letter. Owner only.
 * Body: { encryptedContent, iv, salt, contentHash }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: "Invalid will ID", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const walletAddress = request.headers.get("x-wallet-address");
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing wallet address", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const will = await getWillById(id);
    if (!will) {
      return NextResponse.json(
        { error: "Will not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const user = await getUserByWallet(walletAddress.toLowerCase());
    if (!user || user.id !== will.user_id) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = sealedLetterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { encryptedContent, iv, salt, contentHash } = parsed.data;

    // Check if letter already exists — update or create
    const existing = await getSealedLetterByWillId(id);

    let letter;
    if (existing) {
      letter = await updateSealedLetter(id, {
        encryptedContent,
        iv,
        salt,
        contentHash,
      });
    } else {
      letter = await createSealedLetter({
        willId: id,
        encryptedContent,
        iv,
        salt,
        contentHash,
      });
    }

    return NextResponse.json({ letter }, { status: existing ? 200 : 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
