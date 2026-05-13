import { getSupabaseAdmin } from "../supabase";
import type { SealedLetter } from "../types";

export async function createSealedLetter(params: {
  willId: string;
  encryptedContent: string;
  iv: string;
  salt: string;
  contentHash: string;
}): Promise<SealedLetter> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sealed_letters")
    .insert({
      will_id: params.willId,
      encrypted_content: params.encryptedContent,
      iv: params.iv,
      salt: params.salt,
      content_hash: params.contentHash,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create sealed letter: ${error.message}`);
  return data as SealedLetter;
}

export async function getSealedLetterByWillId(
  willId: string
): Promise<SealedLetter | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sealed_letters")
    .select("*")
    .eq("will_id", willId)
    .single();

  if (error || !data) return null;
  return data as SealedLetter;
}

export async function updateSealedLetter(
  willId: string,
  params: {
    encryptedContent: string;
    iv: string;
    salt: string;
    contentHash: string;
  }
): Promise<SealedLetter> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sealed_letters")
    .update({
      encrypted_content: params.encryptedContent,
      iv: params.iv,
      salt: params.salt,
      content_hash: params.contentHash,
      updated_at: new Date().toISOString(),
    })
    .eq("will_id", willId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update sealed letter: ${error.message}`);
  return data as SealedLetter;
}

export async function deleteSealedLetter(willId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sealed_letters")
    .delete()
    .eq("will_id", willId);

  if (error) throw new Error(`Failed to delete sealed letter: ${error.message}`);
}
