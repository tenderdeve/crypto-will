-- Add optional beneficiary email to wills table
ALTER TABLE wills ADD COLUMN beneficiary_email TEXT;
