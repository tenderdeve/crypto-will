import { getSupabaseAdmin } from "../supabase";
import type { Will, WillStatus } from "../types";

export async function createWill(params: {
  userId: string;
  beneficiaryAddress: string;
  tokenAddresses: string[];
  contractTxHash: string;
  gracePeriodDays: number;
}): Promise<Will> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("wills")
    .insert({
      user_id: params.userId,
      beneficiary_address: params.beneficiaryAddress.toLowerCase(),
      token_addresses: params.tokenAddresses.map((t) => t.toLowerCase()),
      contract_tx_hash: params.contractTxHash,
      grace_period_days: params.gracePeriodDays,
      status: "active",
      last_alive_at: new Date().toISOString(),
      next_check_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create will: ${error.message}`);
  return data as Will;
}

export async function getWillByUserId(userId: string): Promise<Will | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("wills")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error || !data) return null;
  return data as Will;
}

export async function getWillById(id: string): Promise<Will | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("wills")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Will;
}

export async function updateWillStatus(id: string, status: WillStatus): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("wills")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(`Failed to update will: ${error.message}`);
}

export async function updateWillAlive(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("wills")
    .update({
      last_alive_at: new Date().toISOString(),
      next_check_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to update will alive: ${error.message}`);
}

export async function getActiveWillsDueForCheck(): Promise<Will[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("wills")
    .select("*")
    .eq("status", "active")
    .lte("next_check_at", new Date().toISOString());

  if (error) throw new Error(`Failed to query wills: ${error.message}`);
  return (data || []) as Will[];
}

export async function getExpiredWills(): Promise<Will[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("wills")
    .select("*")
    .eq("status", "active");

  if (error) throw new Error(`Failed to query wills: ${error.message}`);

  // Filter in app — check if last_alive + grace_period < now
  const now = Date.now();
  return ((data || []) as Will[]).filter((w) => {
    const lastAlive = new Date(w.last_alive_at).getTime();
    const graceMs = w.grace_period_days * 24 * 60 * 60 * 1000;
    return now > lastAlive + graceMs;
  });
}
