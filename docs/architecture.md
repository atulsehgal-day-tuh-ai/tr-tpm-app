# TR-TPM App Architecture

## High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["Browser (React SPA)"]
        UI[React Components]
        MSAL[MSAL.js]
    end

    subgraph Azure["Azure Cloud"]
        EntraID[Azure Entra ID<br/>Authentication]
        AppService[Azure App Service<br/>Linux Container]
        ACR[Azure Container<br/>Registry]
        PG[(Azure PostgreSQL<br/>Flexible Server)]
    end

    subgraph GitHub["GitHub"]
        Repo[Repository]
        Actions[GitHub Actions<br/>CI/CD]
    end

    UI <-->|API Calls + JWT| AppService
    MSAL <-->|OAuth 2.0 PKCE| EntraID
    AppService <-->|SQL + SSL| PG
    Repo -->|Push| Actions
    Actions -->|Build & Push Image| ACR
    Actions -->|Deploy| AppService
    ACR -->|Pull Image| AppService
```

## Deployment Pipeline

```mermaid
flowchart LR
    subgraph Branches
        main[main branch]
        release[release branch]
        prod[prod branch]
    end

    subgraph Environments
        dev[Dev Environment]
        stage[Stage Environment]
        production[Prod Environment]
    end

    main -->|auto-deploy| dev
    release -->|deploy + approval| stage
    prod -->|deploy + approval| production

    dev -.->|promote| release
    stage -.->|promote| prod
```

## Detailed Application Architecture

```mermaid
flowchart TB
    subgraph Browser["Client (Browser)"]
        subgraph Pages["Next.js Pages (App Router)"]
            Login["/login<br/>Public"]
            Grid["/grid<br/>Protected"]
            Insights["/insights<br/>Protected"]
            Admin["/admin/*<br/>Protected + Admin"]
            Help["/help<br/>Protected"]
        end

        subgraph Components["React Components"]
            AuthUI[AuthUI<br/>Login/Logout]
            TpmPlanner[TpmPlanner<br/>Main Grid Controller]
            TpmGrid[TpmGrid<br/>TanStack Table]
            FiltersBar[FiltersBar<br/>Retailer/Division/PPG]
            GridKPIs[GridKPIs<br/>Summary Cards]
            Charts[Insights Charts<br/>Trends & Bars]
        end

        subgraph ClientLib["Client Libraries"]
            MSALReact["@azure/msal-react"]
            TanStack["@tanstack/react-table"]
        end
    end

    subgraph Server["Next.js Server (Node.js)"]
        subgraph API["API Routes (/api)"]
            PublicConfig["/api/public-config"]
            TestDB["/api/test-db"]

            subgraph AuthRequired["Requires Auth"]
                ForecastAPI["/api/forecast/*<br/>draft, submit, latest"]
                DimensionsAPI["/api/dimensions/*<br/>actuals"]
                InsightsAPI["/api/insights/*"]
            end

            subgraph AdminRequired["Requires Admin"]
                OrgAPI["/api/admin/org"]
                PromoAPI["/api/admin/promo-types"]
                UploadsAPI["/api/admin/uploads"]
                WhoamiAPI["/api/admin/whoami"]
            end
        end

        subgraph Lib["Server Libraries"]
            DB["lib/db.ts<br/>PostgreSQL Pool"]
            AuthServer["lib/auth/server.ts<br/>JWT Validation"]
            AuthAdmin["lib/auth/admin.ts<br/>Admin Check"]
            Fiscal["lib/tpm/fiscal.ts<br/>4-4-5 Calendar"]
            CSV["lib/csv/*<br/>CSV Parsing"]
            Audit["lib/db/audit.ts<br/>Audit Logging"]
        end
    end

    subgraph External["External Services"]
        Entra[Azure Entra ID]
        Postgres[(PostgreSQL)]
    end

    %% Client interactions
    Login --> AuthUI
    Grid --> TpmPlanner
    TpmPlanner --> TpmGrid
    TpmPlanner --> FiltersBar
    TpmPlanner --> GridKPIs
    Insights --> Charts

    AuthUI --> MSALReact
    TpmGrid --> TanStack
    MSALReact <-->|OAuth 2.0| Entra

    %% API calls
    TpmPlanner -->|fetch + JWT| ForecastAPI
    TpmPlanner -->|fetch + JWT| DimensionsAPI
    Charts -->|fetch + JWT| InsightsAPI
    Admin -->|fetch + JWT| OrgAPI
    Admin -->|fetch + JWT| UploadsAPI

    %% Server internals
    ForecastAPI --> AuthServer
    DimensionsAPI --> AuthServer
    OrgAPI --> AuthAdmin
    UploadsAPI --> AuthAdmin
    UploadsAPI --> CSV

    AuthServer -->|Verify JWT| Entra
    AuthAdmin --> AuthServer

    ForecastAPI --> DB
    DimensionsAPI --> DB
    OrgAPI --> DB
    UploadsAPI --> DB
    UploadsAPI --> Audit

    ForecastAPI --> Fiscal

    DB <-->|SSL| Postgres
```

## Data Model (Core Entities)

```mermaid
erDiagram
    RETAILER ||--o{ DIVISION : has
    DIVISION ||--o{ FORECAST_DRAFT : has
    DIVISION ||--o{ PROMOTIONS_RAW : references
    DIVISION ||--o{ BUDGET_RAW : references

    UPLOAD_BATCH ||--o{ ACTUALS_WEEKLY_FACT : contains
    UPLOAD_BATCH ||--o{ PROMOTIONS_RAW : contains
    UPLOAD_BATCH ||--o{ BUDGET_RAW : contains
    UPLOAD_BATCH ||--o{ UPLOAD_ERROR : has

    ACCOUNT ||--o{ ACTUALS_WEEKLY_FACT : references
    PROMO_TYPE ||--o{ DIVISION_PROMO_TYPE : enables
    DIVISION ||--o{ DIVISION_PROMO_TYPE : allows

    RETAILER {
        uuid id PK
        string name
        string manager_email
        string report_email
    }

    DIVISION {
        uuid id PK
        uuid retailer_id FK
        string name
    }

    FORECAST_DRAFT {
        uuid id PK
        string retailer
        string division
        string ppg
        int year
        string status
        jsonb grid_json
        timestamp submitted_at
    }

    ACTUALS_WEEKLY_FACT {
        uuid id PK
        uuid batch_id FK
        string geography
        string product
        date week_end_date
        numeric volume
    }

    PROMOTIONS_RAW {
        uuid id PK
        uuid batch_id FK
        string deal_id
        string promo_status
        string call_point
        string ppg
        date cost_start_date
        date cost_end_date
        numeric forecasted_volume
    }

    BUDGET_RAW {
        uuid id PK
        uuid batch_id FK
        string call_point
        string ppg_item
        numeric total_cases_budgeted
        numeric tr_net_revenue
    }

    PROMO_TYPE {
        uuid id PK
        string code
        string name
    }

    UPLOAD_BATCH {
        uuid id PK
        string kind
        string status
        int row_count
        int error_count
    }
```

## Request Flow (Authentication)

```mermaid
sequenceDiagram
    participant B as Browser
    participant M as MSAL.js
    participant E as Azure Entra ID
    participant A as Next.js API
    participant D as PostgreSQL

    B->>M: User clicks Login
    M->>E: OAuth 2.0 PKCE Authorization
    E->>B: Login popup
    B->>E: User credentials
    E->>M: Access Token + ID Token
    M->>B: Store in sessionStorage

    B->>A: GET /api/forecast/latest<br/>Authorization: Bearer {token}
    A->>E: Fetch JWKS (cached)
    A->>A: Verify JWT signature & claims
    A->>D: SELECT forecast data
    D->>A: Results
    A->>B: JSON response
```

## Request Flow (CSV Upload)

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as /api/admin/uploads
    participant V as Validation
    participant D as PostgreSQL

    B->>A: POST multipart/form-data<br/>(file + kind)
    A->>A: Check admin role
    A->>A: Validate file size (max 10MB)
    A->>D: INSERT upload_batch (processing)

    A->>V: Parse CSV
    V->>V: Validate headers
    V->>V: Validate rows (negative values, etc.)

    alt Actuals/Promotions/Budget
        A->>D: Batch INSERT via UNNEST<br/>(single query for all rows)
    end

    A->>D: UPDATE upload_batch (processed)
    A->>D: INSERT audit_log
    A->>B: { ok: true, rowCount, errorCount }
```

## Component Hierarchy

```mermaid
flowchart TB
    subgraph Root["Root Layout"]
        Providers["Providers<br/>(MSAL + ErrorBoundary)"]

        subgraph Protected["RequireAuth Wrapper"]
            AppLayout["AppLayout<br/>(Header + Nav)"]

            subgraph GridPage["/grid Page"]
                TP[TpmPlanner]
                TP --> FB[FiltersBar]
                TP --> TG[TpmGrid]
                TP --> GK[GridKPIs]
                TG --> TC[Table Cells<br/>Editable Inputs]
            end

            subgraph InsightsPage["/insights Page"]
                IP[InsightsPage]
                IP --> TL[TrendLines]
                IP --> GSB[GroupedStackedBars]
            end

            subgraph AdminPages["/admin/* Pages"]
                OrgPage[OrgPage]
                PromoPage[PromoTypesPage]
                UploadsPage[UploadsPage]
            end
        end
    end

    subgraph UI["UI Primitives"]
        Button
        Input
        Select
        KPICard
        Tooltip
    end

    TC --> Input
    GK --> KPICard
    FB --> Select
```

## Fiscal Calendar (4-4-5 Pattern)

```mermaid
gantt
    title Fiscal Year Structure (4-4-5 Pattern)
    dateFormat  YYYY-MM-DD

    section Q1
    P1 (Jan) - 4 weeks    :p1, 2026-01-05, 28d
    P2 (Feb) - 4 weeks    :p2, after p1, 28d
    P3 (Mar) - 5 weeks    :p3, after p2, 35d

    section Q2
    P4 (Apr) - 4 weeks    :p4, after p3, 28d
    P5 (May) - 4 weeks    :p5, after p4, 28d
    P6 (Jun) - 5 weeks    :p6, after p5, 35d

    section Q3
    P7 (Jul) - 4 weeks    :p7, after p6, 28d
    P8 (Aug) - 4 weeks    :p8, after p7, 28d
    P9 (Sep) - 5 weeks    :p9, after p8, 35d

    section Q4
    P10 (Oct) - 4 weeks   :p10, after p9, 28d
    P11 (Nov) - 4 weeks   :p11, after p10, 28d
    P12 (Dec) - 5 weeks   :p12, after p11, 35d
```

## Tech Stack Summary

```mermaid
mindmap
    root((TR-TPM App))
        Frontend
            Next.js 14
            React 18
            TypeScript
            TanStack Table
            Tailwind CSS
            Radix UI
        Backend
            Next.js API Routes
            Node.js Runtime
            PostgreSQL
            pg library
        Auth
            Azure Entra ID
            MSAL React
            JWT validation
            jose library
        DevOps
            GitHub Actions
            Docker
            Azure Container Registry
            Azure App Service
        Data
            CSV Import
            4-4-5 Fiscal Calendar
            Batch Inserts
            Audit Logging
```
