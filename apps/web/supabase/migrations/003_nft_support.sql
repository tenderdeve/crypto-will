-- NFT support: store ERC-721 and ERC-1155 items per will
CREATE TABLE will_nfts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  will_id uuid REFERENCES wills(id) ON DELETE CASCADE,
  contract_address text NOT NULL,
  token_id text NOT NULL,
  amount text NOT NULL DEFAULT '1',
  nft_type text NOT NULL CHECK (nft_type IN ('erc721', 'erc1155')),
  name text,
  image_url text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_will_nfts_will_id ON will_nfts(will_id);
