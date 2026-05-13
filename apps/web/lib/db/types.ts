export type WillStatus = "active" | "pending_check" | "executed" | "revoked";
export type AliveCheckStatus = "sent" | "confirmed" | "expired";

export interface User {
  id: string;
  wallet_address: string;
  email: string | null;
  created_at: string;
}

export interface Will {
  id: string;
  user_id: string;
  beneficiary_address: string;
  token_addresses: string[];
  contract_tx_hash: string | null;
  grace_period_days: number;
  status: WillStatus;
  last_alive_at: string;
  next_check_at: string;
  created_at: string;
  contract_will_id: number | null;
  contract_version: number;
  guardian_threshold: number | null;
  voting_window_days: number | null;
}

export interface WillGuardian {
  id: string;
  will_id: string;
  guardian_address: string;
  guardian_email: string | null;
  created_at: string;
}

export interface GuardianVote {
  id: string;
  will_id: string;
  guardian_address: string;
  vote_type: "execute" | "alive";
  tx_hash: string | null;
  created_at: string;
}

export interface AliveCheck {
  id: string;
  will_id: string;
  sent_at: string;
  responded_at: string | null;
  signature: string | null;
  token: string;
  status: AliveCheckStatus;
}
