# Project Context: Talking Rain Retailer KPI & Forecast Model

## Role:
You are a Senior Full-Stack Engineer and Data Architect building a Trade Promotion Management (TPM) web application.

## Objective:
Build a web-based "Retailer KPI Forecast Model" (Leading Indicators Tool) to replace a fragile Excel workflow. The goal is to allow Key Account Managers (KAMs) to forecast sales volumes and view financial KPIs without "breaking" the underlying formulas.

---

## 1. The Domain & Terminology

### Client:
Talking Rain (Beverage Company).

### Core Entity:
PPG (Price Pack Group) / SKU.

### Timeframe:
The company operates on a 4-4-5 Retail Calendar (not standard Gregorian months).

### Key Metrics:
- **Volume**: Case counts.
- **DA (Depletion Allowance)**: Often mislabeled as "Depletion" in legacy systems. This is the trade spend/discount provided to retailers.
- **TR Share**: Talking Rain's share of the discount.
- **Scan Back**: A specific type of discount based on scanned sales.
- **Net Revenue**: Gross Revenue minus Trade Spend.

---

## 2. Data Ingestion & Schema

We are ingesting data from **Anaplan** (Budget/Promotions) and **Circana** (Actuals).

### A. Budget Data (2025 and 2026 Annual Budgets.csv)

**Purpose**: Serves as the baseline for the forecast.

**Key Columns to Map**:
- **Call Point** (Retailer Name)
- **PPG - Item** (Product)
- **Weeks** (Duration)
- **Weekly Volume** (cases per store)
- **Retailer Margin %**
- **TR Net Revenue**
- **TR Gross Margin $**

### B. Promotions Data (2025 and 2026 Pricing Promotions.csv)

**Purpose**: Defines the trade events that drive volume spikes.

**Key Columns to Map**:
- **Deal ID** (Unique Key)
- **Promo Status** (Critical statuses: Planned, Active, Ended, Confirmed)
- **Cost Start Date / Cost End Date**
- **TR Share of Discount** (The cost per case to TR)
- **Forecasted Volume**

---

## 3. Business Logic & Calculation Rules

### The "Leading Indicators" Logic:
We need to calculate future volume. The user (KAM) provides a volume forecast.

**Calculation**:
`Forecasted Volume * (TR Share of Discount + Scan Back) = Total Estimated Spend.`

### Actuals vs. Forecast:
- If a Deal Status is "Ended", we must stop using the forecast and use the Actual Volume (ingested from Circana/Ex-Factory data) to calculate the final financial impact.

### Naming Convention Fix:
In the UI and Code, strictly use "DA" or "Depletion Allowance". Do not use "Depletion" generic text, as stakeholders (Emilia) find it confusing.

### Granularity:
The view must be aggregatable by **Retailer -> Division -> PPG**.

---

## 4. Technical Constraints & Architecture

- **Frontend**: React (Next.js App Router preferred) for a responsive grid interface.
- **State Management**: Must handle "grid-like" inputs where users update volume numbers, and totals recalculate instantly (similar to Excel).
- **Resilience**: Unlike the Excel sheet, the app must prevent users from overwriting logic formulas. Only "Forecast Volume" fields should be editable.

---

## 5. Immediate Task

Generate the initial project structure and a schema definition (TypeScript interfaces or Python Models) that matches the CSV columns provided above.
