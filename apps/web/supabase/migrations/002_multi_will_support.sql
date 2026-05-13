-- Multi-will support: add contract_will_id and contract_version columns
ALTER TABLE wills ADD COLUMN contract_will_id integer;
ALTER TABLE wills ADD COLUMN contract_version integer DEFAULT 1;

-- Index for efficient lookup by contract version
CREATE INDEX idx_wills_contract_version ON wills(contract_version);
