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

### IT-friendly runbook (GitHub Actions → ACR → App Service)

This is the clean “enterprise” path when you **cannot (or don’t want to) run Docker locally**.

#### Executive summary (non-technical)

We deploy this Node.js/Next.js application as a **container image** (a packaged, self-contained “app box” that includes the code and everything it needs to run). Instead of building that container on a developer laptop, we use **GitHub Actions** as a controlled build system that creates the container image every time we push changes to the `main` branch.

The container image is stored in **Azure Container Registry (ACR)**, which is Azure’s private storage for container images. **Azure App Service** then runs the app by pulling the latest approved image from ACR. To keep this secure, App Service uses a **Managed Identity** with the minimum required permission (**AcrPull**) so it can pull images from ACR **without any registry passwords**.

Overall: **GitHub Actions builds → ACR stores → App Service runs**, and configuration (database URL, Azure AD IDs) is provided via **App Settings** in Azure rather than hard-coded in the application.

#### What we are building (concepts)

- **GitHub Actions**: a build server that runs in GitHub. It will build the container image for you on every push.
- **ACR (Azure Container Registry)**: a private Docker image registry in Azure (like a private Docker Hub).
- **Azure App Service (Linux Container)**: the web hosting service. It *pulls* the image from ACR and runs it.
- **Managed Identity + AcrPull**: a secure way for App Service to pull from ACR **without storing registry passwords**.

#### Prerequisites

- You have an Azure subscription (billing enabled).
- Azure CLI installed (`az version` works) or use Azure Cloud Shell.
- You have a GitHub repo for this code and can add GitHub Secrets.

---

### Step A1) Create (or pick) a Resource Group

Purpose: a Resource Group is a container for related Azure resources (ACR, App Service, etc.).

```bash
az group create -n tr-tpm-rg -l westus2
```

If it already exists, you can check its region:

```bash
az group show -n tr-tpm-rg --query location -o tsv
```

---

### Step A2) Create an Azure Container Registry (ACR)

Purpose: store your Docker images privately so App Service can run them.

```bash
az acr create -g tr-tpm-rg -n trtpmacr12345 --sku Basic
az acr show -g tr-tpm-rg -n trtpmacr12345 --query loginServer -o tsv
```

You should get a login server like: `trtpmacr12345.azurecr.io`.

---

### Step A3) Create an Azure Service Principal for GitHub Actions

Purpose: GitHub Actions needs a “machine identity” it can use to log in to Azure and push images to ACR.

```bash
ACR_ID=$(az acr show -n trtpmacr12345 -g tr-tpm-rg --query id -o tsv)

az ad sp create-for-rbac \
  --name "tr-tpm-gh-actions" \
  --role contributor \
  --scopes "$ACR_ID" \
  --sdk-auth
```

This prints a JSON blob. **Copy it.**

---

### Step A4) Add GitHub Secrets

Purpose: store credentials securely so they are not committed to git.

In GitHub repo → **Settings → Secrets and variables → Actions**:

- **Secret: `AZURE_CREDENTIALS`** = paste the JSON from Step A3
- **Secret: `ACR_LOGIN_SERVER`** = `trtpmacr12345.azurecr.io`

---

### Step A5) Add the GitHub Actions workflow

Purpose: automatically build and push a Docker image to ACR on every push to `main`.

File path:

```text
.github/workflows/acr-build-push.yml
```

Once committed to `main`, go to GitHub → **Actions** and confirm the workflow run is green.

---

### Step A6) Create the App Service Plan (Linux)

Purpose: the compute “plan” the web app runs on.

```bash
az appservice plan create -g tr-tpm-rg -n tr-tpm-plan --is-linux --sku B1 -l westus2
```

---

### Step A7) Create the Web App (Linux Container)

Purpose: the actual website endpoint that will run your container.

```bash
az webapp create \
  -g tr-tpm-rg \
  -p tr-tpm-plan \
  -n tr-tpm-test-app-v1
```

Note: You may see warnings about deprecated flags; those are okay for now.

---

### Step A8) Allow the Web App to pull from ACR (Managed Identity)

Purpose: App Service must be able to pull your image from ACR. We do this securely using Managed Identity.

```bash
# Enable system-assigned identity on the web app
az webapp identity assign -g tr-tpm-rg -n tr-tpm-test-app-v1

# Grant AcrPull to the web app identity on the ACR
PRINCIPAL_ID=$(az webapp identity show -g tr-tpm-rg -n tr-tpm-test-app-v1 --query principalId -o tsv)
ACR_ID=$(az acr show -n trtpmacr12345 -g tr-tpm-rg --query id -o tsv)
az role assignment create --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal --role AcrPull --scope "$ACR_ID"

# Tell the web app to use Managed Identity creds when pulling from ACR
SUB_ID=$(az account show --query id -o tsv)
az resource update --ids "/subscriptions/$SUB_ID/resourceGroups/tr-tpm-rg/providers/Microsoft.Web/sites/tr-tpm-test-app-v1/config/web" --set properties.acrUseManagedIdentityCreds=true
```

---

### Step A9) Point the Web App to your image in ACR

Purpose: configure which container image App Service should run.

```bash
az webapp config container set \
  -g tr-tpm-rg \
  -n tr-tpm-test-app-v1 \
  --docker-custom-image-name trtpmacr12345.azurecr.io/tr-tpm-test-app:latest \
  --docker-registry-server-url https://trtpmacr12345.azurecr.io
```

Also set required container settings:

```bash
az webapp config appsettings set -g tr-tpm-rg -n tr-tpm-test-app-v1 --settings \
  WEBSITES_PORT=3000 \
  WEBSITES_ENABLE_APP_SERVICE_STORAGE=false
```

---

### Step A10) Set the app environment variables (runtime configuration)

Purpose: provide DB and Azure AD settings securely at runtime (not in source code).

```bash
az webapp config appsettings set -g tr-tpm-rg -n tr-tpm-test-app-v1 --settings \
  DATABASE_URL="<YOUR_DATABASE_URL>" \
  NEXT_PUBLIC_AZURE_AD_CLIENT_ID="<CLIENT_ID>" \
  NEXT_PUBLIC_AZURE_AD_TENANT_ID="<TENANT_ID>" \
  NEXT_PUBLIC_AZURE_AD_REDIRECT_URI="https://tr-tpm-test-app-v1.azurewebsites.net"
```

#### Azure AD (Entra ID) login: important notes

Purpose: make sure users can sign in successfully using the correct Entra App Registration.

- Use the **App Registration for the web app** (example display name: `TR TPM Test App`) for:
  - `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`
  - `NEXT_PUBLIC_AZURE_AD_TENANT_ID`
- Do **NOT** use the GitHub Actions service principal app (example display name: `tr-tpm-gh-actions`). That identity is only for CI/CD to push images.

Entra App Registration configuration (Azure Portal → Microsoft Entra ID → App registrations → your app → **Authentication**):

- Add a **Single-page application (SPA)** Redirect URI:
  - `https://tr-tpm-test-app-v1.azurewebsites.net`
- (Optional) for local testing add:
  - `http://localhost:3000`

Runtime verification endpoints (safe):

- Check the app sees your env vars:
  - `https://tr-tpm-test-app-v1.azurewebsites.net/api/public-config`

---

#### Database: Azure Database for PostgreSQL (Flexible Server) setup (basic testing)

Purpose: create a Postgres database in Azure and allow the web app to connect.

1) Create / open your server: Azure Database for PostgreSQL Flexible Server (example: `db-tr-tpm-test`).

2) Networking (quick test):
   - PostgreSQL server → **Networking**
   - Enable **Public access**
   - Check **Allow public access from any Azure service within Azure to this server**
   - Save

3) Authentication mode (important):
   - PostgreSQL server → **Security → Authentication**
   - Select **PostgreSQL authentication only**
   - Click **Reset password** and set a password for the admin login (example: `tr_test_admin`)
   - Save

4) Set `DATABASE_URL` in the Web App:

Example format:

```text
postgresql://tr_test_admin:<PASSWORD>@db-tr-tpm-test.postgres.database.azure.com:5432/postgres?sslmode=require
```

Notes:
- `sslmode=require` is recommended for Azure Postgres.
- If your password contains special characters (like `@`), URL-encode them (example: `@` → `%40`).

5) Restart the Web App after changing settings:

```bash
az webapp restart -g tr-tpm-rg -n tr-tpm-test-app-v1
```

6) Verify database connectivity:
   - `https://tr-tpm-test-app-v1.azurewebsites.net/api/test-db`

If it fails, the API returns a `details` block (error code/message) to help IT troubleshoot (for example wrong password, firewall, SSL).

---

#### Forcing App Service to pull the newest container image

Purpose: sometimes `:latest` is cached; pinning to a specific image tag forces a new pull.

1) List tags in ACR:

```bash
az acr repository show-tags -n trtpmacr12345 --repository tr-tpm-test-app --orderby time_desc --top 10 -o table
```

2) Set the Web App to a specific tag (example tag is a git SHA):

```bash
az webapp config container set \
  -g tr-tpm-rg \
  -n tr-tpm-test-app-v1 \
  --docker-custom-image-name trtpmacr12345.azurecr.io/tr-tpm-test-app:<TAG> \
  --docker-registry-server-url https://trtpmacr12345.azurecr.io
```

Then restart the app.

---

### Step A11) Restart and verify

```bash
az webapp restart -g tr-tpm-rg -n tr-tpm-test-app-v1
```

Open:

- `https://tr-tpm-test-app-v1.azurewebsites.net`

Verification checklist:

- App loads
- Azure AD login works
- “Test Database Connection” works

---

### Common troubleshooting

- **“No credential was provided to access Azure Container Registry”**
  - This usually means the Web App is not configured to use Managed Identity to pull images, or the identity lacks `AcrPull`.
  - Re-run Steps A8–A9.

- **App starts but shows errors**
  - Check App Service logs: Azure Portal → Web App → **Log stream**

- **DB connection errors**
  - Confirm `DATABASE_URL` is set in App Service configuration.
  - Confirm Azure Postgres firewall/network allows the App Service outbound IPs (see Web App → Properties → outbound IPs).
  - Ensure SSL is enabled (Azure Postgres requires it).

---

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
- `ACR_NAME`: ACR resource name (example: `trtpmacr12345`)
- `ACR_LOGIN_SERVER`: ACR login server (example: `trtpmacr12345.azurecr.io`)
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