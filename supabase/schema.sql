-- RadRelay schema. Run against the Supabase Postgres instance.
-- Enable realtime on `cases` and `audit_log` after creating (Supabase dashboard or SQL).

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_language TEXT DEFAULT 'en',
  imaging_center_id UUID,
  report_pdf_url TEXT,            -- Supabase Storage URL (was S3 in PRD)
  parsed_findings JSONB,
  guideline_classification JSONB,
  confidence NUMERIC(3,2),
  patient_script TEXT,
  signoff_status TEXT DEFAULT 'pending'
    CHECK (signoff_status IN ('pending','approved','rejected','flagged_low_confidence')),
  signoff_at TIMESTAMPTZ,
  call_sid TEXT,
  call_outcome TEXT,
  call_transcript TEXT,
  followup_booked_slot TEXT,      -- mocked synthetic slot in v1
  cost_usd NUMERIC(10,4)
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor TEXT,
  action TEXT,
  details JSONB
);

CREATE TABLE radiologists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  phone TEXT,
  email TEXT
);

-- Realtime for the dashboard:
-- ALTER PUBLICATION supabase_realtime ADD TABLE cases;
-- ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;
