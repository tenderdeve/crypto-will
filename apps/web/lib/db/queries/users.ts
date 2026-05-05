import { getSupabaseAdmin } from "../supabase";
import type { User } from "../types";

export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  if (error || !data) return null;
  return data as User;
}

export async function createUser(walletAddress: string, email?: string): Promise<User> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .insert({ wallet_address: walletAddress.toLowerCase(), email })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return data as User;
}

export async function updateUserEmail(userId: string, email: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("users")
    .update({ email })
    .eq("id", userId);

  if (error) throw new Error(`Failed to update email: ${error.message}`);
}
