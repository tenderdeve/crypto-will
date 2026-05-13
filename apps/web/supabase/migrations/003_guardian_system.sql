-- Guardian system: will_guardians, guardian_votes, and wills columns

CREATE TABLE will_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  will_id uuid REFERENCES wills(id) ON DELETE CASCADE,
  guardian_address text NOT NULL,
  guardian_email text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_will_guardians_will_id ON will_guardians(will_id);

ALTER TABLE will_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_will_guardians" ON will_guardians FOR ALL
  USING (auth.role() = 'service_role');

CREATE TABLE guardian_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  will_id uuid REFERENCES wills(id) ON DELETE CASCADE,
  guardian_address text NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('execute', 'alive')),
  tx_hash text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_guardian_votes_will_id ON guardian_votes(will_id);

ALTER TABLE guardian_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_guardian_votes" ON guardian_votes FOR ALL
  USING (auth.role() = 'service_role');

ALTER TABLE wills ADD COLUMN guardian_threshold integer;
ALTER TABLE wills ADD COLUMN voting_window_days integer;
