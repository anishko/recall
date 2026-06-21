-- Run after schema.sql if the cases table already exists.

ALTER TABLE cases ADD COLUMN IF NOT EXISTS patient_summary TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS risk_tier TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS contact_cadence_hours INTEGER;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS next_contact_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS call_attempts INTEGER DEFAULT 0;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS family_contact_phone TEXT;
