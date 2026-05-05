import { getSupabaseAdmin } from "../supabase";
import type { AliveCheck } from "../types";

export async function createAliveCheck(willId: string): Promise<AliveCheck> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("alive_checks")
    .insert({ will_id: willId, status: "sent" })
    .select()
    .single();

  if (error) throw new Error(`Failed to create alive check: ${error.message}`);
  return data as AliveCheck;
}

export async function getAliveCheckByToken(token: string): Promise<AliveCheck | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("alive_checks")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) return null;
  return data as AliveCheck;
}

export async function confirmAliveCheck(id: string, signature: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("alive_checks")
    .update({
      status: "confirmed",
      responded_at: new Date().toISOString(),
      signature,
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to confirm alive check: ${error.message}`);
}

export async function getAliveChecksByWillId(willId: string): Promise<AliveCheck[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("alive_checks")
    .select("*")
    .eq("will_id", willId)
    .order("sent_at", { ascending: false });

  if (error) throw new Error(`Failed to get alive checks: ${error.message}`);
  return (data || []) as AliveCheck[];
}
