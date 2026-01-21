-- 006_forecast_ppg.sql
-- Add PPG scoping to forecast drafts/submissions.

ALTER TABLE forecast_snapshot
  ADD COLUMN IF NOT EXISTS ppg TEXT NOT NULL DEFAULT 'ALL';

-- Backfill (for safety if column existed but had nulls somehow)
UPDATE forecast_snapshot SET ppg = 'ALL' WHERE ppg IS NULL;

DROP INDEX IF EXISTS ux_forecast_snapshot_draft;
CREATE UNIQUE INDEX IF NOT EXISTS ux_forecast_snapshot_draft
  ON forecast_snapshot(user_entra_oid, retailer, division, year, ppg)
  WHERE status = 'draft';

DROP INDEX IF EXISTS idx_forecast_snapshot_lookup;
CREATE INDEX IF NOT EXISTS idx_forecast_snapshot_lookup
  ON forecast_snapshot(user_entra_oid, retailer, division, year, ppg, status, saved_at DESC);

