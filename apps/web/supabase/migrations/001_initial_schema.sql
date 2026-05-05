-- CryptoWill Database Schema

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wills table
CREATE TABLE wills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  beneficiary_address TEXT NOT NULL,
  token_addresses TEXT[] NOT NULL,
  contract_tx_hash TEXT,
  grace_period_days INT DEFAULT 90,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending_check', 'executed', 'revoked')),
  last_alive_at TIMESTAMPTZ DEFAULT NOW(),
  next_check_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alive checks table
CREATE TABLE alive_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  will_id UUID REFERENCES wills(id) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  signature TEXT,
  token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'confirmed', 'expired'))
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wills ENABLE ROW LEVEL SECURITY;
ALTER TABLE alive_checks ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for API routes using service role key)
CREATE POLICY "service_role_all_users" ON users FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_wills" ON wills FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_alive_checks" ON alive_checks FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_wills_user_id ON wills(user_id);
CREATE INDEX idx_wills_status ON wills(status);
CREATE INDEX idx_wills_next_check ON wills(next_check_at);
CREATE INDEX idx_alive_checks_will_id ON alive_checks(will_id);
CREATE INDEX idx_alive_checks_token ON alive_checks(token);
CREATE INDEX idx_alive_checks_status ON alive_checks(status);
