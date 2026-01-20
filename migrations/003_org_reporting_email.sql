-- 003_org_reporting_email.sql
-- Org hierarchy mapping using emails (fastest path; avoids needing Graph to resolve Entra OIDs).

CREATE TABLE IF NOT EXISTS org_reporting_email (
  id UUID PRIMARY KEY,
  manager_email TEXT NOT NULL,
  report_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (manager_email, report_email),
  CHECK (manager_email <> report_email)
);

CREATE INDEX IF NOT EXISTS idx_org_reporting_email_manager ON org_reporting_email(manager_email);
