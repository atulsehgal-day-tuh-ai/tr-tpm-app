# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trade Promotion Management (TPM) web application for Talking Rain (beverage company). Replaces an Excel-based "Leading Indicators" forecast tool that allows Key Account Managers to forecast sales volumes and view financial KPIs.

**Domain terminology:**
- **PPG** (Price Pack Group): Core product entity (SKU grouping)
- **DA** (Depletion Allowance): Trade spend/discount to retailers (never use "Depletion" alone)
- **4-4-5 Retail Calendar**: Fiscal periods P1–P12 mapped to months, with 4+4+5 weeks per quarter

## Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run migrate      # Run SQL migrations (scripts/migrate.mjs)
npm run db:reset     # Destructive reset - requires ALLOW_DB_RESET=true (dev/stage only)
```

## Architecture

**Stack:** Next.js 14 (App Router) + React 18 + TypeScript + PostgreSQL + Azure AD (MSAL)

**Key directories:**
- `app/(app)/` - Protected routes requiring auth (grid, insights, admin, help)
- `app/(public)/` - Public routes (login)
- `app/api/` - API routes (admin CRUD, forecasts, dimensions, insights)
- `components/tpm/` - Main grid/planner components (TpmPlanner, TpmGrid, filters)
- `components/ui/` - Reusable UI primitives (Radix-based)
- `lib/tpm/` - Business logic (fiscal calendar, KPI calculations, demo scaling)
- `lib/db.ts` - PostgreSQL connection pool (singleton, auto-SSL for Azure)
- `lib/auth/` - Auth utilities (server.ts for JWT validation, admin.ts for role checks)
- `migrations/` - SQL schema files (numbered, run by custom migration runner)

**Data flow:**
1. Client authenticates via Azure AD popup (MSAL stores token in sessionStorage)
2. Protected pages wrapped in `<RequireAuth>` component
3. API routes validate JWT via `lib/auth/server.ts`
4. Direct PostgreSQL queries via `pg` library (no ORM)

**Fiscal calendar logic** (`lib/tpm/fiscal.ts`):
- 4-4-5 pattern: 52 weeks split as 4+4+5 per quarter
- 53-week years add extra week to P12
- `getFiscalPeriodsForYear(year)` returns period metadata with ISO week ranges

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=...
NEXT_PUBLIC_AZURE_AD_TENANT_ID=...
NEXT_PUBLIC_AZURE_AD_REDIRECT_URI=http://localhost:3000
```

## Deployment

**Environments:** Dev (main branch) → Stage (release branch) → Prod (prod branch)

GitHub Actions builds Docker image, pushes to Azure Container Registry, deploys to Azure App Service. Each environment has separate Postgres database and Entra ID app registration.

**CI workflows:**
- `pr-check.yml` - Lint + build on PRs
- `dev-stage-prod-build-deploy.yml` - Build/deploy per branch
- `db-migrate.yml` - Manual migration runner
- `db-reset.yml` - Destructive reset (dev/stage only)
