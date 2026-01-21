-- 005_forecast_drafts.sql
-- Forecast drafts + submissions (per user + retailer/division/year).

CREATE TABLE IF NOT EXISTS forecast_snapshot (
  id UUID PRIMARY KEY,
  user_entra_oid TEXT NOT NULL,
  user_email TEXT,
  retailer TEXT NOT NULL,
  division TEXT NOT NULL,
  year INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','submitted')),
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  data JSONB NOT NULL
);

-- One active draft per (user, retailer, division, year)
CREATE UNIQUE INDEX IF NOT EXISTS ux_forecast_snapshot_draft
  ON forecast_snapshot(user_entra_oid, retailer, division, year)
  WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS idx_forecast_snapshot_lookup
  ON forecast_snapshot(user_entra_oid, retailer, division, year, status, saved_at DESC);

