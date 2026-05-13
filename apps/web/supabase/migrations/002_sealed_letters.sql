-- Sealed letters table — encrypted messages from will owner to beneficiary
CREATE TABLE sealed_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  will_id UUID UNIQUE REFERENCES wills(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,  -- base64 AES-256-GCM ciphertext
  iv TEXT NOT NULL,                 -- base64 initialization vector
  salt TEXT NOT NULL,               -- base64 PBKDF2 salt
  content_hash TEXT NOT NULL,       -- SHA-256 of plaintext (integrity check)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE sealed_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_sealed_letters" ON sealed_letters FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_sealed_letters_will_id ON sealed_letters(will_id);
