# TR TPM Test App

A basic test application to verify the recommended tech stack for the Talking Rain TPM system.

## Stack

- **Frontend/Framework**: Next.js 14 (React) with TypeScript
- **Runtime**: Node.js
- **Database**: PostgreSQL
- **Authentication**: Azure AD (Entra ID) with MSAL

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database running and accessible
- Azure AD app registration configured

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/tr_tpm_db

# Azure AD Configuration
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id-here
NEXT_PUBLIC_AZURE_AD_TENANT_ID=your-tenant-id-here
NEXT_PUBLIC_AZURE_AD_REDIRECT_URI=http://localhost:3000
```

#### Using Azure Database for PostgreSQL (Flexible Server)

- **Get the connection string**: Azure Portal → your PostgreSQL server → **Connection strings**
- **SSL**: Azure Postgres requires SSL. This app enables SSL automatically when your `DATABASE_URL` contains `.postgres.database.azure.com`.

Example `DATABASE_URL` formats:

```env
# Example (Azure Database for PostgreSQL - Flexible Server)
# NOTE: Your username often looks like: adminuser@your-server-name
# NOTE: URL-encode special characters in passwords (e.g., @ becomes %40)
DATABASE_URL=postgresql://adminuser%40your-server-name:yourPassword@your-server-name.postgres.database.azure.com:5432/yourDbName
```

### Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE tr_tpm_db;
```

2. The application will automatically create the test table on first connection.

### Running schema migrations (recommended)

This repo includes a simple SQL migration runner.

- Local:

```bash
# Ensure DATABASE_URL is set (or stored in .env.local)
npm run migrate
```

- GitHub Actions (Dev/Stage/Prod):
  - Run workflow: **DB Migrate (manual)**
  - Ensure each GitHub Environment (`dev`, `stage`, `prod`) has secret **`DATABASE_URL`** set.

### Resetting schema in Dev/Stage (destructive, for experimentation)

While iterating pre-production, you may prefer to **drop and recreate** tables instead of applying incremental `ALTER TABLE` migrations.

- Local reset (DEV only):

```bash
# DANGER: drops ALL tables in the public schema
set ALLOW_DB_RESET=true
npm run db:reset
```

- GitHub Actions reset (Dev/Stage only):
  - Run workflow: **DB Reset (manual, destructive)**
  - Requires a confirmation input like `RESET-dev` or `RESET-stage`.
  - This workflow intentionally does **not** support prod.

After reset, the DB is seeded with baseline master data (see `migrations/002_seed_baseline.sql`):
- Retailers/Divisions: Publix, Kroger (+ sample divisions)
- Promo Types: Frontline, 10/$10, Buy 2 Get 1, Scan Back
- Promo applicability: enabled for all seeded divisions
- Fiscal calendar config: default 4-4-5 pattern (admin can edit weeks/periods)

### Azure AD Setup

1. Register an application in Azure Portal (Azure Active Directory > App registrations)
2. Configure:
   - **Redirect URI**: `http://localhost:3000` (for development)
   - **Supported account types**: Based on your organization's needs
   - **API permissions**: Microsoft Graph > User.Read (for basic authentication)
3. Copy the **Application (client) ID** and **Directory (tenant) ID** to your `.env.local` file

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Test the components:
   - **Azure AD**: Click "Login with Azure AD" to test authentication
   - **PostgreSQL**: Click "Test Database Connection" to verify database connectivity

## Docker (containerized deployment)

This repo includes a `Dockerfile` that packages the app using Next.js **standalone** output.

### Build the image

```bash
docker build -t tr-tpm-app:local .
```

### Run the container locally

```bash
docker run --rm -p 3000:3000 --env-file .env.local tr-tpm-app:local
```

Then open `http://localhost:3000`.

## Deploy: Azure App Service (Linux Container)

### Overview (GitHub Actions → ACR → App Service)

This repo deploys a **containerized Next.js app** to **Azure App Service (Linux Container)** using:

- **GitHub Actions**: builds + pushes the Docker image
- **ACR (Azure Container Registry)**: stores images privately
- **App Service**: runs the image by pulling from ACR
- **Managed Identity + AcrPull**: App Service pulls from ACR **without passwords**

Why this approach:

- **Build once, promote upward**: the exact same image tag (commit SHA) runs in Dev → Stage → Prod
- **No “works on my machine”**: builds happen in CI
- **Secrets stay out of git**: DB URL + Entra IDs live in App Service config

### Prerequisites

- An Azure subscription (billing enabled)
- Azure CLI (`az`) installed + logged in
- A GitHub repo for this code
- App Service and Postgres naming decided for Dev/Stage/Prod

### Deployment runbook (PowerShell, new subscription, Dev/Stage/Prod)

This runbook reflects the exact approach we used during setup:

- **4 resource groups**: `shared` (ACR), plus `dev`, `stage`, `prod`
- **1 shared ACR**: images stored centrally
- **3 App Service plans**: isolate compute per environment
- **3 Web Apps**: isolate runtime per environment
- **3 Postgres servers**: isolate data per environment
- **3 Entra app registrations**: isolate auth config per environment
- **3 CI service principals**: least-privilege GitHub Actions credentials per environment

#### Step 0) Choose values (example)

- **Region**: `westus2`
- **Resource groups**:
  - Shared: `tr-tpm-shared-rg`
  - Dev: `tr-tpm-dev-rg`
  - Stage: `tr-tpm-stage-rg`
  - Prod: `tr-tpm-prod-rg`
- **ACR (shared)**: `trtpmacrdaytuhai01` (`trtpmacrdaytuhai01.azurecr.io`)
- **Web apps**: `tr-tpm-app-dev`, `tr-tpm-app-stage`, `tr-tpm-app-prod`
- **Postgres servers**: `db-pg-tr-tpm-dev`, `db-pg-tr-tpm-stage`, `db-pg-tr-tpm-prod`
- **Databases**: `tr_tpm_dev`, `tr_tpm_stage`, `tr_tpm_prod`

#### Step 1) Select the subscription (NEW subscription)

Purpose: everything you create after this is billed/governed under this subscription.

```powershell
az login
az account list -o table
az account set --subscription "<NEW_SUBSCRIPTION_ID_OR_NAME>"
az account show -o table
```

#### Step 2) Register required Azure providers (critical in new subscriptions)

Purpose: brand-new subscriptions often are not registered for ACR/AppService/Postgres yet.

If you skip this, you’ll see errors like:
- `MissingSubscriptionRegistration` for `Microsoft.ContainerRegistry`
- `MissingSubscriptionRegistration` for `Microsoft.DBforPostgreSQL`

```powershell
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.Web
az provider register --namespace Microsoft.DBforPostgreSQL

while ((az provider show --namespace Microsoft.ContainerRegistry --query registrationState -o tsv) -ne "Registered") { Start-Sleep 10 }
while ((az provider show --namespace Microsoft.Web              --query registrationState -o tsv) -ne "Registered") { Start-Sleep 10 }
while ((az provider show --namespace Microsoft.DBforPostgreSQL  --query registrationState -o tsv) -ne "Registered") { Start-Sleep 10 }
```

#### Step 3) Create resource groups (shared + dev + stage + prod)

Purpose: isolate resources and access control per environment.

```powershell
$LOCATION = "westus2"
$RG_SHARED = "tr-tpm-shared-rg"
$RG_DEV    = "tr-tpm-dev-rg"
$RG_STAGE  = "tr-tpm-stage-rg"
$RG_PROD   = "tr-tpm-prod-rg"

az group create -n $RG_SHARED -l $LOCATION
az group create -n $RG_DEV    -l $LOCATION
az group create -n $RG_STAGE  -l $LOCATION
az group create -n $RG_PROD   -l $LOCATION
```

#### Step 4) Create the shared ACR

Purpose: store images in one place; all web apps pull from it. (Shared ACR is common and not inherently a problem.)

```powershell
$ACR_NAME = "trtpmacrdaytuhai01"

az acr check-name -n $ACR_NAME -o table
az acr create -g $RG_SHARED -n $ACR_NAME --sku Basic

$ACR_LOGIN_SERVER = az acr show -g $RG_SHARED -n $ACR_NAME --query loginServer -o tsv
$ACR_ID           = az acr show -g $RG_SHARED -n $ACR_NAME --query id -o tsv
```

#### Step 5) Create 3 CI service principals (least privilege)

Purpose: GitHub Actions needs Azure credentials to push images and update each environment. For a real app, use one service principal **per environment**.

Each command prints a JSON blob—copy it and store it as GitHub Environment secret `AZURE_CREDENTIALS` for that environment.

```powershell
$SHARED_RG_ID = az group show -n $RG_SHARED --query id -o tsv
$DEV_RG_ID    = az group show -n $RG_DEV    --query id -o tsv
$STAGE_RG_ID  = az group show -n $RG_STAGE  --query id -o tsv
$PROD_RG_ID   = az group show -n $RG_PROD   --query id -o tsv

az ad sp create-for-rbac --name "tr-tpm-gh-actions-dev"   --role contributor --scopes $SHARED_RG_ID $DEV_RG_ID   --sdk-auth
az ad sp create-for-rbac --name "tr-tpm-gh-actions-stage" --role contributor --scopes $SHARED_RG_ID $STAGE_RG_ID --sdk-auth
az ad sp create-for-rbac --name "tr-tpm-gh-actions-prod"  --role contributor --scopes $SHARED_RG_ID $PROD_RG_ID  --sdk-auth
```

#### Step 6) Create App Service plans (separate per environment)

Purpose: compute isolation; dev load can’t slow prod.

```powershell
$PLAN_DEV   = "tr-tpm-plan-dev"
$PLAN_STAGE = "tr-tpm-plan-stage"
$PLAN_PROD  = "tr-tpm-plan-prod"

az appservice plan create -g $RG_DEV   -n $PLAN_DEV   --is-linux --sku B1   -l $LOCATION
az appservice plan create -g $RG_STAGE -n $PLAN_STAGE --is-linux --sku B1   -l $LOCATION
az appservice plan create -g $RG_PROD  -n $PLAN_PROD  --is-linux --sku P1v3 -l $LOCATION
```

#### Step 7) Create Web Apps (as container apps)

Purpose: create the app endpoints first, then let CI wire them to your ACR image.

Why we use a placeholder image here:

- Some `az webapp create` variants require `--runtime` for Linux plans, and in PowerShell the `|` in strings like `NODE|20-lts` can be parsed as a pipe if not escaped.
- Creating a web app as a **container** app avoids that runtime-string issue.

```powershell
$APP_DEV   = "tr-tpm-app-dev"
$APP_STAGE = "tr-tpm-app-stage"
$APP_PROD  = "tr-tpm-app-prod"

az webapp create -g $RG_DEV   -p $PLAN_DEV   -n $APP_DEV   --deployment-container-image-name mcr.microsoft.com/azuredocs/containerapps-helloworld:latest
az webapp create -g $RG_STAGE -p $PLAN_STAGE -n $APP_STAGE --deployment-container-image-name mcr.microsoft.com/azuredocs/containerapps-helloworld:latest
az webapp create -g $RG_PROD  -p $PLAN_PROD  -n $APP_PROD  --deployment-container-image-name mcr.microsoft.com/azuredocs/containerapps-helloworld:latest
```

Note: `--deployment-container-image-name` is deprecated but still works; CI will overwrite the container config later.

#### Step 8) Allow each Web App to pull from ACR (Managed Identity)

Purpose: eliminate registry passwords; use Managed Identity + `AcrPull`.

```powershell
az webapp identity assign -g $RG_DEV   -n $APP_DEV
az webapp identity assign -g $RG_STAGE -n $APP_STAGE
az webapp identity assign -g $RG_PROD  -n $APP_PROD

$DEV_PID   = az webapp identity show -g $RG_DEV   -n $APP_DEV   --query principalId -o tsv
$STAGE_PID = az webapp identity show -g $RG_STAGE -n $APP_STAGE --query principalId -o tsv
$PROD_PID  = az webapp identity show -g $RG_PROD  -n $APP_PROD  --query principalId -o tsv

az role assignment create --assignee-object-id $DEV_PID   --assignee-principal-type ServicePrincipal --role AcrPull --scope $ACR_ID
az role assignment create --assignee-object-id $STAGE_PID --assignee-principal-type ServicePrincipal --role AcrPull --scope $ACR_ID
az role assignment create --assignee-object-id $PROD_PID  --assignee-principal-type ServicePrincipal --role AcrPull --scope $ACR_ID

$SUB_ID = az account show --query id -o tsv
az resource update --ids "/subscriptions/$SUB_ID/resourceGroups/$RG_DEV/providers/Microsoft.Web/sites/$APP_DEV/config/web"     --set properties.acrUseManagedIdentityCreds=true
az resource update --ids "/subscriptions/$SUB_ID/resourceGroups/$RG_STAGE/providers/Microsoft.Web/sites/$APP_STAGE/config/web" --set properties.acrUseManagedIdentityCreds=true
az resource update --ids "/subscriptions/$SUB_ID/resourceGroups/$RG_PROD/providers/Microsoft.Web/sites/$APP_PROD/config/web"   --set properties.acrUseManagedIdentityCreds=true
```

#### Step 9) Create Postgres (Flexible Server) per environment

Purpose: data isolation per environment.

Notes:

- Provisioning can take **5–15+ minutes**; “InProgress” for several minutes is normal.
- You cannot retrieve the existing password later; if you don’t know it you must **reset** it.
- The server admin username cannot be changed after creation; only the password can be reset.

```powershell
$PG_DEV   = "db-pg-tr-tpm-dev"
$PG_STAGE = "db-pg-tr-tpm-stage"
$PG_PROD  = "db-pg-tr-tpm-prod"

az postgres flexible-server create -g $RG_DEV   -n $PG_DEV   -l $LOCATION --version 16 --tier Burstable      --sku-name Standard_B1ms  --storage-size 32  --public-access 0.0.0.0-255.255.255.255
az postgres flexible-server create -g $RG_STAGE -n $PG_STAGE -l $LOCATION --version 16 --tier Burstable      --sku-name Standard_B1ms  --storage-size 32  --public-access 0.0.0.0-255.255.255.255
az postgres flexible-server create -g $RG_PROD  -n $PG_PROD  -l $LOCATION --version 16 --tier GeneralPurpose --sku-name Standard_D2s_v3 --storage-size 128 --public-access 0.0.0.0-255.255.255.255

az postgres flexible-server db create -g $RG_DEV   -s $PG_DEV   -d tr_tpm_dev
az postgres flexible-server db create -g $RG_STAGE -s $PG_STAGE -d tr_tpm_stage
az postgres flexible-server db create -g $RG_PROD  -s $PG_PROD  -d tr_tpm_prod
```

#### Step 10) Entra ID (Azure AD) app registrations (per environment)

Purpose: browser authentication via MSAL (this app uses `@azure/msal-react` → SPA auth).

For each environment (`dev`, `stage`, `prod`):

- Create an App Registration
  - **Account type**: typically **Multitenant** if Talking Rain is in another tenant
- Authentication
  - Add **Single-page application (SPA)** redirect URI:
    - Dev: `https://tr-tpm-app-dev.azurewebsites.net`
    - Stage: `https://tr-tpm-app-stage.azurewebsites.net`
    - Prod: `https://tr-tpm-app-prod.azurewebsites.net`
  - Leave **Implicit grant** unchecked (Access tokens, ID tokens)
  - Leave **Allow public client flows** disabled
- API permissions
  - Microsoft Graph → Delegated → `User.Read`

Record for each environment:

- `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`
- `NEXT_PUBLIC_AZURE_AD_TENANT_ID`
- `NEXT_PUBLIC_AZURE_AD_REDIRECT_URI` (the env URL above)

#### Step 11) Configure App Service environment variables (per environment)

Purpose: provide runtime configuration (DB + Entra IDs) securely via App Service settings.

Portal path:

- App Service → your app (`tr-tpm-app-dev`) → **Settings → Environment variables** (or **Configuration**) → **Application settings**

Set (per environment):

- `DATABASE_URL` (different per env)
- `NEXT_PUBLIC_AZURE_AD_CLIENT_ID` (different per env)
- `NEXT_PUBLIC_AZURE_AD_TENANT_ID`
- `NEXT_PUBLIC_AZURE_AD_REDIRECT_URI` (env URL)
- `WEBSITES_PORT=3000`
- `WEBSITES_ENABLE_APP_SERVICE_STORAGE=false`

Azure Postgres URL format:

```text
postgresql://USER:PASSWORD@SERVER.postgres.database.azure.com:5432/DB_NAME?sslmode=require
```

#### Step 12) GitHub Environments + secrets (dev/stage/prod)

Purpose: CI/CD credentials + targets per environment.

Create GitHub Environments:

- `dev`
- `stage` (recommended: approvals)
- `prod` (recommended: approvals)

In each environment, add **secrets**:

- `AZURE_CREDENTIALS` (JSON from the matching service principal in Step 5)
- `ACR_NAME` = `trtpmacrdaytuhai01`
- `ACR_LOGIN_SERVER` = `trtpmacrdaytuhai01.azurecr.io`
- `AZURE_RESOURCE_GROUP` = the env RG (`tr-tpm-dev-rg`, etc.)
- `AZURE_WEBAPP_NAME` = the env web app (`tr-tpm-app-dev`, etc.)

#### Step 13) Deploy by promotion (Dev → Stage → Prod)

- Push/merge to `main` → deploys **dev**
- Merge `main` → `release` → deploys **stage**
- Merge `release` → `prod` → deploys **prod**

Verify:

- Home: `https://<app>.azurewebsites.net`
- Runtime config: `https://<app>.azurewebsites.net/api/public-config`
- DB test: `https://<app>.azurewebsites.net/api/test-db`

### Troubleshooting (issues we hit during setup)

- **Azure provider not registered (new subscription)**
  - **Symptom**: `MissingSubscriptionRegistration` for `Microsoft.ContainerRegistry` or `Microsoft.DBforPostgreSQL`
  - **Fix**: run Step 2 provider registration and wait until `Registered`
- **GitHub Actions Azure login fails**
  - **Symptom**: `Login failed ... Ensure 'client-id' and 'tenant-id' are supplied`
  - **Fix**: `AZURE_CREDENTIALS` is missing/invalid in GitHub Environment secrets
- **PowerShell parsing issues**
  - **Symptom**: runtime strings like `NODE|20-lts` behave like a pipe; multi-line bash commands fail
  - **Fix**: use PowerShell backtick for line continuation and avoid `|` strings (or escape). Creating container apps with a placeholder image is simplest.
- **PR Checks failing at `next lint`**
  - **Symptom**: CI shows an interactive prompt like “How would you like to configure ESLint?” and exits with code 1
  - **Fix**: ensure ESLint is configured in-repo. This repo includes `.eslintrc.json` (extends `next/core-web-vitals`) to keep `npm run lint` non-interactive in GitHub Actions.
- **Site “loads forever” in browser**
  - **Common cause**: the Web App is still running the placeholder image (`mcr.microsoft.com/...helloworld`)
  - **Fix**: ensure GitHub Actions ran successfully and updated container settings to your ACR image/tag; check App Service → **Deployment Center → Containers**
- **Container doesn’t start / image pull errors**
  - **Fix**: confirm `acrUseManagedIdentityCreds=true`, the web app identity has `AcrPull` on the ACR, and `WEBSITES_PORT=3000` is set
  - **Where to look**: App Service → **Log stream**
- **Postgres provisioning takes time**
  - **Note**: 5–15+ minutes for create is normal; don’t interrupt immediately
- **Forgot DB password**
  - **Note**: you cannot view current password; you must reset it
  - **Note**: you cannot change the admin username after server creation


## Operating Model for the Real Application (Dev → Stage → Prod)

This section describes a simple, low-hassle way to run 3 environments across Git, the app, the database, and secrets. The goal is: **build once, promote upward**, and keep production stable.

### Environments (recommended)
- **Dev**: daily development and quick iteration
- **Stage (UAT)**: production-like testing and business sign-off
- **Prod**: locked-down, audited, stable

---

## 1) Git + CI/CD (how code moves upward)

**Goal:** the same code and container image moves from Dev → Stage → Prod with approvals.

### Branch strategy (simple)
- **`main`** → deploys to **Dev**
- **`release`** (or `staging`) → deploys to **Stage**
- **`prod`** (or tags like `v1.2.3`) → deploys to **Prod**

### Promotion steps
1. Develop on a feature branch → PR into `main` (Dev deploy)
2. Validate in Dev → PR `main` → `release` (Stage deploy)
3. UAT sign-off → PR `release` → `prod` (Prod deploy) OR tag a release (e.g., `v1.0.0`)

### Guardrails (recommended)
- Require PRs (no direct push) to `release` / `prod`
- Require CI checks to pass before merge
- Use **immutable image tags** (commit SHA) for Stage/Prod (avoid `latest`)

### Implemented in this repo (GitHub Actions + GitHub Environments)

This repository includes:

- `.github/workflows/dev-stage-prod-build-deploy.yml`
  - On push to branches:
    - `main` → **dev**
    - `release` → **stage**
    - `prod` → **prod**
  - Builds the Docker image (Next.js standalone), pushes it to ACR, and deploys the Web App to the **immutable** tag `:<GIT_SHA>`.
- `.github/workflows/pr-check.yml`
  - Runs `npm ci`, `npm run lint`, and `npm run build` on PRs into `main` / `release` / `prod`.

#### Required GitHub Environments + secrets

Create 3 GitHub Environments in your repo:

- `dev`
- `stage`
- `prod` (recommended: configure environment approvals)

In each Environment, set these **secrets**:

- `AZURE_CREDENTIALS`: JSON output of `az ad sp create-for-rbac --sdk-auth` (service principal used by GitHub Actions)
- `ACR_NAME`: ACR resource name (example: `trtpmacrdaytuhai01`)
- `ACR_LOGIN_SERVER`: ACR login server (example: `trtpmacrdaytuhai01.azurecr.io`)
- `AZURE_RESOURCE_GROUP`: resource group name (example: `tr-tpm-rg`)
- `AZURE_WEBAPP_NAME`: web app name for that environment (example: `tr-tpm-app-dev`, `tr-tpm-app-stage`, `tr-tpm-app-prod`)

Optional (Environment **variable**):

- `ACR_REPOSITORY`: image repository name inside ACR (defaults to the GitHub repo name)

#### Promotion flow

- Merge to `main` → deploys **dev**
- Merge `main` → `release` → deploys **stage** (use GitHub Environment approvals for gatekeeping)
- Merge `release` → `prod` → deploys **prod** (approvals recommended)

---

## 2) Application layer (containers)

**Goal:** separate app instances per environment; only configuration differs.

Create three Azure App Service instances (Linux containers):
- `app-dev`
- `app-stage`
- `app-prod`

Each should run:
- Dev: can use a moving tag (optional)
- Stage/Prod: pinned tag (e.g., `tr-tpm-app:<GIT_SHA>`)

### Required App Settings per environment
- `DATABASE_URL` (different per env)
- `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`
- `NEXT_PUBLIC_AZURE_AD_TENANT_ID`
- `NEXT_PUBLIC_AZURE_AD_REDIRECT_URI` (must match that env URL)
- `WEBSITES_PORT=3000`
- `WEBSITES_ENABLE_APP_SERVICE_STORAGE=false`

---

## 3) Database layer

**Goal:** Dev data never touches Prod; schema changes are controlled.

Recommended setup:
- Separate DBs/servers:
  - `db_dev`
  - `db_stage`
  - `db_prod`

---

## Production performance & scale strategy (100 concurrent users)

For a user base around **100 concurrent users** on a stack like **Next.js + Prisma + Azure PostgreSQL**, “slowness” is usually not caused by user count. It is almost always caused by **inefficient data handling** (too many DB round-trips, heavy queries, no indexes, large grids rendering too much, etc.).

TPM apps can feel “heavy” because they involve **math, large grids, and complex filtering**. Use the strategy below to keep a “zero-latency” feel.

### 1) Database layer: connection pooling (crucial)

**Problem:** If many users save at the same moment, the app can open too many DB connections. Postgres has connection limits; once exceeded, users experience latency or failures.

**Solution:** Use **connection pooling** (a small set of DB connections reused efficiently).

**How to do it in Azure:**
- Azure Database for PostgreSQL Flexible Server can be configured for pooling using **pgBouncer / connection pooling** (availability/UX varies by Azure region and server configuration).
- In Azure Portal, check your Postgres server for:
  - **Connection pooling** settings, and/or
  - `pgbouncer` related settings in **Server parameters**

**How to do it in Prisma:**
- Use the pooling connection endpoint/port provided by Azure (often a different port than 5432; confirm in the Azure Portal).
- Keep using an **immutable** connection string per environment and store it as a secret (Key Vault).

### 2) Application layer: optimistic UI (how it “feels instant”)

**Problem:** User edits a budget cell → spinner → wait for server → UI updates. Even 200–500ms feels slow in spreadsheet-like experiences.

**Solution:** **Optimistic updates**: update the UI immediately, then save in the background; rollback if the server fails.

**How to implement:**
- Use **React Query** or **SWR** for data fetching + optimistic mutations.
- Combine with table virtualization (only render visible rows) for large grids.

### 3) Data layer: indexing & summary tables (fast dashboards)

**Problem:** Dashboards that aggregate across large history tables can become slow as data grows (e.g., millions of rows).

**Solutions:**
- **Indexes:** add indexes on columns you filter/join frequently (retailer, product, date, promotion id, etc.).
  - In Prisma, this typically means adding `@@index([...])` to your models.
- **Materialized views / summary tables (advanced):**
  - Precompute heavy aggregates (hourly/daily) into a summary table.
  - Dashboards read summaries (fast) instead of scanning raw history (slow).

### 4) Infrastructure: right-sizing Azure

**Dev/Test:** Burstable tiers can be cost-effective for occasional usage, but can degrade under sustained load.

**Prod:** Use a tier with **guaranteed CPU** (general purpose/compute-optimized depending on your workload) and size based on:
- number of concurrent editors
- size of grids
- complexity of calculations/queries
- expected growth of history tables

### Practical action plan (simple)
- Start with pooling + indexing + optimistic UI first (largest impact).
- Add summary tables/materialized views only when real data volume justifies it.

### Migrations
Use a migration tool (Prisma / Flyway / Liquibase / etc.) and apply migrations:
- Automatically in Dev
- With approval in Stage
- With strict change control in Prod

### Data policy (recommended)
- Dev: dummy/synthetic data
- Stage: masked/sanitized data if needed
- Prod: real data with backups + retention + least-privilege access

---

## 4) Secrets and configuration

**Goal:** secrets never live in code; they are injected per environment.

Recommended:
- Use **Azure Key Vault** (or AWS Secrets Manager if on AWS)
- Store secrets:
  - `DATABASE_URL`
  - API keys / tokens
- Keep non-secret config as env vars (e.g., `NEXT_PUBLIC_*`)

---

## 5) Access control / governance

**Goal:** least privilege, with increasing controls by environment.

- Dev: small engineering group
- Stage: testers + admins
- Prod: restricted admins, auditing, and an emergency “break-glass” path

---

## Rollback strategy

Because Stage/Prod use pinned container tags, rollback is simple:
- Reconfigure the Web App to point to the previous known-good image tag
- Restart the Web App

## Deploy: AWS ECS (Fargate)

High-level steps:

1. **Create an ECR repo** (or use an existing one).
2. **Build + push the image** to ECR.
3. **Create an ECS Task Definition** exposing port `3000`.
4. **Create an ECS Service** (Fargate) behind an ALB.
5. **Set env vars / secrets** (ECS task env vars or AWS Secrets Manager):
   - `DATABASE_URL`
   - `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`
   - `NEXT_PUBLIC_AZURE_AD_TENANT_ID`
   - `NEXT_PUBLIC_AZURE_AD_REDIRECT_URI` (should be your app URL)

## Project Structure

```
.
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── test-db/       # Database test endpoint
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page with test UI
│   ├── providers.tsx      # MSAL provider setup
│   └── globals.css        # Global styles
├── lib/                   # Utility libraries
│   ├── db.ts              # PostgreSQL connection and utilities
│   └── authConfig.ts      # Azure AD MSAL configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript configuration
- ✅ PostgreSQL database connection
- ✅ Azure AD authentication with MSAL
- ✅ Test page to verify all components
- ✅ Basic error handling

## Next Steps

This is a minimal test app. For the full TPM application, you'll need to:

1. Expand database schema for Budget, Forecast, Actual data
2. Implement proper authentication flows and role-based access
3. Add data models for Accounts, Promotions, Products
4. Create API routes for CRUD operations
5. Build user interface for data entry and reporting
6. Add data validation and business logic

## Notes

- Make sure your PostgreSQL database is running before testing
- Azure AD authentication requires proper app registration in Azure Portal
- The app uses MSAL React for client-side authentication
- Database connection pooling is configured for production use