-- 004_uploads.sql
-- Upload batches + staging/raw tables for Actuals, Promotions, and Budget CSVs.

CREATE TABLE IF NOT EXISTS upload_batch (
  id UUID PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('actuals_circana','promotions','budget')),
  original_filename TEXT,
  uploaded_by_email TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processing','processed','failed')),
  row_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS upload_error (
  id UUID PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES upload_batch(id) ON DELETE CASCADE,
  row_number INT,
  message TEXT NOT NULL,
  row_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_error_batch ON upload_error(batch_id);

-- Raw promotions rows (row-based CSV)
CREATE TABLE IF NOT EXISTS promotions_raw (
  id UUID PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES upload_batch(id) ON DELETE CASCADE,
  deal_id TEXT,
  promo_status TEXT,
  promo_type TEXT,
  call_point TEXT,
  ppg TEXT,
  promo_start_date DATE,
  promo_end_date DATE,
  cost_start_date DATE,
  cost_end_date DATE,
  scan_back_per_cs NUMERIC,
  tr_share_of_discount NUMERIC,
  forecasted_volume NUMERIC,
  circana_geography TEXT,
  route_to_market TEXT,
  row_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_raw_batch ON promotions_raw(batch_id);
CREATE INDEX IF NOT EXISTS idx_promotions_raw_lookup ON promotions_raw(call_point, ppg, promo_start_date, promo_end_date);

-- Raw budget rows (row-based CSV)
CREATE TABLE IF NOT EXISTS budget_raw (
  id UUID PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES upload_batch(id) ON DELETE CASCADE,
  call_point TEXT,
  ppg_item TEXT,
  weeks_text TEXT,
  weekly_volume_per_store NUMERIC,
  total_cases_budgeted NUMERIC,
  tr_share_of_discount NUMERIC,
  scan_back_per_case NUMERIC,
  tr_net_revenue NUMERIC,
  row_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_raw_batch ON budget_raw(batch_id);
CREATE INDEX IF NOT EXISTS idx_budget_raw_lookup ON budget_raw(call_point, ppg_item);

-- Actuals is a wide format where each "Week Ending mm-dd-yy" column is a datapoint.
-- We store it normalized to weekly facts for querying/rollups.
CREATE TABLE IF NOT EXISTS actuals_weekly_fact (
  id UUID PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES upload_batch(id) ON DELETE CASCADE,
  geography TEXT NOT NULL,
  product TEXT NOT NULL,
  week_end_date DATE NOT NULL,
  volume NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actuals_weekly_batch ON actuals_weekly_fact(batch_id);
CREATE INDEX IF NOT EXISTS idx_actuals_weekly_lookup ON actuals_weekly_fact(geography, product, week_end_date);

