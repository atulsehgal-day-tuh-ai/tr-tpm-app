"use client";

import * as React from "react";
import { FiltersBar, type Filters } from "@/components/tpm/filters-bar";
import { createPublix2026Mock } from "@/lib/tpm/mockPublix2026";
import { formatNumber, sum } from "@/lib/tpm/fiscal";
import { useIdToken } from "@/components/auth/use-id-token";
import Link from "next/link";
import { SegmentedControl } from "@/components/insights/segmented-control";
import { BucketTrendLines } from "@/components/insights/bucket-trend-lines";
import { buildMockInsightsSeries, type InsightsViewKey } from "@/lib/tpm/insights-series";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hashToUnitInterval(s: string) {
  // Deterministic, fast hash for mock scope scaling (not crypto).
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0..1
  return (h >>> 0) / 4294967295;
}

function scaleArr(arr: number[], factor: number) {
  return arr.map((v) => v * factor);
}

function scaleMetricBlock(
  m: { cyActual: number[]; cyForecast: number[]; budget: number[]; lastYear: number[] },
  factor: number
) {
  return {
    cyActual: scaleArr(m.cyActual, factor),
    cyForecast: scaleArr(m.cyForecast, factor),
    budget: scaleArr(m.budget, factor),
    lastYear: scaleArr(m.lastYear, factor),
  };
}

function scaleInsightsSeries(s: any, factor: number) {
  if (!s || typeof s !== "object") return s;
  return {
    ...s,
    view: {
      period: { ...s.view.period, sales: scaleMetricBlock(s.view.period.sales, factor), volume: scaleMetricBlock(s.view.period.volume, factor), spend: scaleMetricBlock(s.view.period.spend, factor) },
      quarter: { ...s.view.quarter, sales: scaleMetricBlock(s.view.quarter.sales, factor), volume: scaleMetricBlock(s.view.quarter.volume, factor), spend: scaleMetricBlock(s.view.quarter.spend, factor) },
      annual: { ...s.view.annual, sales: scaleMetricBlock(s.view.annual.sales, factor), volume: scaleMetricBlock(s.view.annual.volume, factor), spend: scaleMetricBlock(s.view.annual.spend, factor) },
    },
    annual: {
      sales: { ...s.annual.sales, cyTotal: s.annual.sales.cyTotal * factor, budget: s.annual.sales.budget * factor, lastYear: s.annual.sales.lastYear * factor },
      volume: { ...s.annual.volume, cyTotal: s.annual.volume.cyTotal * factor, budget: s.annual.volume.budget * factor, lastYear: s.annual.volume.lastYear * factor },
      spend: { ...s.annual.spend, cyTotal: s.annual.spend.cyTotal * factor, budget: s.annual.spend.budget * factor, lastYear: s.annual.spend.lastYear * factor },
    },
    ytd: {
      volume: { ...s.ytd.volume, cyActual: s.ytd.volume.cyActual * factor, lastYearYtd: s.ytd.volume.lastYearYtd * factor },
    },
  };
}

export default function InsightsPage() {
  // Insights dashboard
  const { token } = useIdToken();
  const [filters, setFilters] = React.useState<Filters>({
    retailer: "Publix",
    division: "Atlanta Division",
    year: 2026,
  });
  const [view, setView] = React.useState<InsightsViewKey>("period");
  const [pacing, setPacing] = React.useState<"bucket" | "cumulative">("bucket");

  const [team, setTeam] = React.useState<{ managerEmail: string; reports: { id: string; email: string }[] } | null>(
    null
  );
  const [teamError, setTeamError] = React.useState<string | null>(null);
  const [scope, setScope] = React.useState<string>("me");

  // MVP: use existing mock series (until DB-backed rollups land).
  const mock = React.useMemo(() => createPublix2026Mock(), []);
  const series = React.useMemo(() => buildMockInsightsSeries({ mock, year: filters.year }), [mock, filters.year]);
  const scopeFactor = React.useMemo(() => {
    if (scope === "me") return 1;
    if (scope === "team") return 1.35;
    if (scope.startsWith("report:")) {
      const id = scope.slice("report:".length);
      const email = team?.reports.find((r) => r.id === id)?.email ?? id;
      const t = hashToUnitInterval(email.toLowerCase());
      return 0.55 + t * 0.45; // 0.55..1.00
    }
    return 1;
  }, [scope, team]);
  const scopedSeries = React.useMemo(() => scaleInsightsSeries(series, scopeFactor), [series, scopeFactor]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadTeam() {
      setTeamError(null);
      setTeam(null);
      if (!token) return;
      try {
        const res = await fetch("/api/insights/my-team", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load team");
        if (!cancelled) setTeam({ managerEmail: data.managerEmail, reports: data.reports });
      } catch (e: any) {
        if (!cancelled) setTeamError(e?.message || "Failed to load team");
      }
    }
    loadTeam();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const cards = React.useMemo(() => {
    const salesBud = scopedSeries.annual.sales.budget;
    const salesAct = scopedSeries.annual.sales.cyTotal;
    const volBud = scopedSeries.annual.volume.budget;
    const volAct = scopedSeries.annual.volume.cyTotal;
    const spendBud = scopedSeries.annual.spend.budget;
    const spendAct = scopedSeries.annual.spend.cyTotal;
    return [
      { title: "Retail Sales", bud: salesBud, act: salesAct, style: "currency" as const },
      { title: "Volume (Cases)", bud: volBud, act: volAct, style: "number" as const },
      { title: "Trade Spend", bud: spendBud, act: spendAct, style: "currency" as const },
    ];
  }, [scopedSeries]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-lg font-semibold tracking-tight">Insights</div>
            <div className="text-sm text-muted-foreground">
              Track performance with <span className="font-medium text-foreground">actuals through last completed week</span>, then{" "}
              <span className="font-medium text-foreground">forecast through year-end</span>. Switch views to see Period, Quarter, or Annual rollups.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {view !== "annual" ? (
              <SegmentedControl
                value={pacing}
                onChange={setPacing}
                items={[
                  { key: "bucket", label: "Bucket" },
                  { key: "cumulative", label: "Cumulative" },
                ]}
              />
            ) : null}
            <SegmentedControl
              value={view}
              onChange={setView}
              items={[
                { key: "period", label: "Period" },
                { key: "quarter", label: "Quarter" },
                { key: "annual", label: "Annual" },
              ]}
            />
          </div>
        </div>
      </div>

      <TeamScopeCard
        token={token}
        team={team}
        teamError={teamError}
        scope={scope}
        onScopeChange={setScope}
      />

      <FiltersBar value={filters} onChange={setFilters} />

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold tracking-tight">Performance tracking window</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {series.cutoff.weekEndDate ? (
                <>
                  Actuals through <span className="font-medium text-foreground">{series.cutoff.weekEndDate}</span> • Forecast from{" "}
                  <span className="font-medium text-foreground">{series.cutoff.nextWeekEndDate ?? "next week"}</span> to year-end
                </>
              ) : (
                <>No actuals window for this year (future year) — forecast only.</>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" />
              Actuals
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              Forecast
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-slate-400" />
              Budget
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
              Last year
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold tracking-tight">{c.title}</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-[11px] font-medium text-muted-foreground">Budget</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {formatNumber(c.bud, { style: c.style })}
                </div>
              </div>
              <div className="rounded-lg bg-sky-50 p-3">
                <div className="text-[11px] font-medium text-muted-foreground">Actuals</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {formatNumber(c.act, { style: c.style })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {view === "annual" ? (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <div className="text-sm font-semibold tracking-tight">Annual Summary</div>
            <div className="text-xs text-muted-foreground">
              FY uses actuals+forecast through year-end. YTD uses actuals through last completed week.
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <CompareTile
              title="FY Sales vs Budget"
              a={scopedSeries.annual.sales.cyTotal}
              b={scopedSeries.annual.sales.budget}
              style="currency"
            />
            <CompareTile
              title="FY Sales vs LY"
              a={scopedSeries.annual.sales.cyTotal}
              b={scopedSeries.annual.sales.lastYear}
              style="currency"
            />
            <CompareTile
              title="YTD Volume vs LY"
              a={scopedSeries.ytd.volume.cyActual}
              b={scopedSeries.ytd.volume.lastYearYtd}
              style="number"
            />
            <CompareTile
              title="FY Spend vs Budget"
              a={scopedSeries.annual.spend.cyTotal}
              b={scopedSeries.annual.spend.budget}
              style="currency"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <TrendPanel
            title="Retail Sales"
            subtitle="CY total vs LY (solid→dashed after cutoff)"
            labels={scopedSeries.view[view].labels}
            cyActual={scopedSeries.view[view].sales.cyActual}
            cyForecast={scopedSeries.view[view].sales.cyForecast}
            lastYear={scopedSeries.view[view].sales.lastYear}
            cutoffBucketIndex={view === "period" ? series.cutoff.periodIndex : series.cutoff.quarterIndex}
            unit="currency"
            cumulative={pacing === "cumulative"}
          />
          <TrendPanel
            title="Volume (Cases)"
            subtitle="CY total vs LY (solid→dashed after cutoff)"
            labels={scopedSeries.view[view].labels}
            cyActual={scopedSeries.view[view].volume.cyActual}
            cyForecast={scopedSeries.view[view].volume.cyForecast}
            lastYear={scopedSeries.view[view].volume.lastYear}
            cutoffBucketIndex={view === "period" ? series.cutoff.periodIndex : series.cutoff.quarterIndex}
            unit="number"
            cumulative={pacing === "cumulative"}
          />
          <TrendPanel
            title="Trade Spend"
            subtitle="CY total vs LY (solid→dashed after cutoff)"
            labels={scopedSeries.view[view].labels}
            cyActual={scopedSeries.view[view].spend.cyActual}
            cyForecast={scopedSeries.view[view].spend.cyForecast}
            lastYear={scopedSeries.view[view].spend.lastYear}
            cutoffBucketIndex={view === "period" ? series.cutoff.periodIndex : series.cutoff.quarterIndex}
            unit="currency"
            cumulative={pacing === "cumulative"}
          />
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b px-4 py-3">
              <div className="text-sm font-semibold tracking-tight">Quick Comparisons</div>
              <div className="text-xs text-muted-foreground">
                FY uses actuals+forecast through year-end. YTD uses actuals through last completed week.
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
              <CompareTile
                title="FY Sales vs Budget"
                a={scopedSeries.annual.sales.cyTotal}
                b={scopedSeries.annual.sales.budget}
                style="currency"
              />
              <CompareTile
                title="FY Sales vs LY"
                a={scopedSeries.annual.sales.cyTotal}
                b={scopedSeries.annual.sales.lastYear}
                style="currency"
              />
              <CompareTile
                title="YTD Volume vs LY"
                a={scopedSeries.ytd.volume.cyActual}
                b={scopedSeries.ytd.volume.lastYearYtd}
                style="number"
              />
              <CompareTile
                title="FY Spend vs Budget"
                a={scopedSeries.annual.spend.cyTotal}
                b={scopedSeries.annual.spend.budget}
                style="currency"
              />
            </div>
          </div>
        </div>
      )}

      <RollupTable
        view={view}
        pacing={pacing}
        labels={scopedSeries.view[view].labels}
        sales={scopedSeries.view[view].sales}
        volume={scopedSeries.view[view].volume}
        spend={scopedSeries.view[view].spend}
      />
    </div>
  );
}

function TrendPanel({
  title,
  subtitle,
  labels,
  cyActual,
  cyForecast,
  lastYear,
  cutoffBucketIndex,
  unit,
  cumulative,
}: {
  title: string;
  subtitle: string;
  labels: string[];
  cyActual: number[];
  cyForecast: number[];
  lastYear: number[];
  cutoffBucketIndex: number | null;
  unit: "currency" | "number";
  cumulative: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-sm font-semibold tracking-tight">{title}</div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>
          <div className="text-[11px] text-muted-foreground">{cumulative ? "Cumulative" : "Bucket"}</div>
        </div>
      </div>
      <div className="p-4">
        <BucketTrendLines
          labels={labels}
          cyActual={cyActual}
          cyForecast={cyForecast}
          lastYear={lastYear}
          cutoffBucketIndex={cutoffBucketIndex}
          unit={unit}
          cumulative={cumulative}
        />
      </div>
    </div>
  );
}

function CompareTile({
  title,
  a,
  b,
  style,
}: {
  title: string;
  a: number;
  b: number;
  style: "currency" | "number";
}) {
  const delta = a - b;
  const pct = b === 0 ? null : delta / b;
  const up = delta >= 0;
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-[11px] font-medium text-muted-foreground">{title}</div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="text-base font-semibold tabular-nums">{formatNumber(a, { style })}</div>
        <div className={`text-xs font-semibold tabular-nums ${up ? "text-emerald-600" : "text-rose-600"}`}>
          {formatNumber(delta, { style })} {pct === null ? "" : `(${formatNumber(pct, { style: "percent" })})`}
        </div>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        vs {formatNumber(b, { style })}
      </div>
    </div>
  );
}

function TeamScopeCard({
  token,
  team,
  teamError,
  scope,
  onScopeChange,
}: {
  token: string | null;
  team: { managerEmail: string; reports: { id: string; email: string }[] } | null;
  teamError: string | null;
  scope: string;
  onScopeChange: (next: string) => void;
}) {
  const options = React.useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [{ value: "me", label: "Me" }];
    if (team && team.reports.length > 0) {
      opts.push({ value: "team", label: "My Team (rollup)" });
      for (const r of team.reports) opts.push({ value: `report:${r.id}`, label: r.email });
    }
    return opts;
  }, [team]);

  React.useEffect(() => {
    // Ensure selected scope remains valid as team loads/changes
    const ok = options.some((o) => o.value === scope);
    if (!ok) onScopeChange("me");
  }, [options, scope, onScopeChange]);

  return (
    <div className="rounded-xl border bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">Team scope</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Driven by <Link className="text-primary hover:underline" href="/admin/org">Admin → Team Hierarchy</Link>.{" "}
            <span className="hidden md:inline">Charts + tables respond to this selection.</span>
          </div>
        </div>
        <div className="min-w-[260px]">
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">Scope</div>
          <Select value={scope} onValueChange={onScopeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select scope" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        {!token ? (
          <>Sign in to load your team mapping.</>
        ) : teamError ? (
          <span className="text-red-600">{teamError}</span>
        ) : !team ? (
          <>Loading team…</>
        ) : team.reports.length === 0 ? (
          <>
            No direct reports mapped for <span className="font-medium text-foreground">{team.managerEmail}</span>.
          </>
        ) : (
          <>
            Manager: <span className="font-medium text-foreground">{team.managerEmail}</span> • Direct reports:{" "}
            <span className="font-medium text-foreground">{team.reports.length}</span>
            <span className="ml-2 text-[11px] text-muted-foreground">
              (Mock scope scaling until DB rollups land)
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function prefixSum(arr: number[]) {
  const out = new Array<number>(arr.length);
  let acc = 0;
  for (let i = 0; i < arr.length; i++) {
    acc += arr[i] ?? 0;
    out[i] = acc;
  }
  return out;
}

function RollupTable({
  view,
  pacing,
  labels,
  sales,
  volume,
  spend,
}: {
  view: InsightsViewKey;
  pacing: "bucket" | "cumulative";
  labels: string[];
  sales: { cyActual: number[]; cyForecast: number[]; budget: number[]; lastYear: number[] };
  volume: { cyActual: number[]; cyForecast: number[]; budget: number[]; lastYear: number[] };
  spend: { cyActual: number[]; cyForecast: number[]; budget: number[]; lastYear: number[] };
}) {
  const cumulative = view === "annual" ? false : pacing === "cumulative";
  const showTotal = view !== "annual";

  const normalize = (arr: number[]) => {
    const out = Array.from({ length: labels.length }, (_, i) => arr[i] ?? 0);
    return cumulative ? prefixSum(out) : out;
  };

  const rowFor = (m: { cyActual: number[]; cyForecast: number[]; budget: number[]; lastYear: number[] }) => {
    const cy = normalize(m.cyActual).map((v, i) => v + (normalize(m.cyForecast)[i] ?? 0));
    const ly = normalize(m.lastYear);
    const bud = normalize(m.budget);
    const total = (xs: number[]) => (xs.length ? (cumulative ? xs[xs.length - 1] ?? 0 : sum(xs)) : 0);
    return {
      cy,
      ly,
      bud,
      totals: { cy: total(cy), ly: total(ly), bud: total(bud) },
    };
  };

  const salesR = rowFor(sales);
  const volR = rowFor(volume);
  const spendR = rowFor(spend);

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-sm font-semibold tracking-tight">Rollup table</div>
            <div className="text-xs text-muted-foreground">
              Follows your view selection (Period/Quarter/Annual). CY is shown as a single row (Actuals+Forecast).
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Mode: {view === "period" ? "Period" : view === "quarter" ? "Quarter" : "Annual"} •{" "}
            {cumulative ? "Cumulative" : "Bucket"}
          </div>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs text-muted-foreground">Metric</th>
              {labels.map((l) => (
                <th key={l} className="px-4 py-2 text-right text-xs text-muted-foreground">
                  {l}
                </th>
              ))}
              {showTotal ? (
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">Total</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            <RollupGroup label="Retail Sales" style="currency" rows={salesR} showTotal={showTotal} />
            <RollupGroup label="Volume (Cases)" style="number" rows={volR} showTotal={showTotal} />
            <RollupGroup label="Trade Spend" style="currency" rows={spendR} showTotal={showTotal} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RollupGroup({
  label,
  style,
  rows,
  showTotal,
}: {
  label: string;
  style: "currency" | "number";
  rows: {
    cy: number[];
    ly: number[];
    bud: number[];
    totals: { cy: number; ly: number; bud: number };
  };
  showTotal: boolean;
}) {
  return (
    <>
      <tr className="border-t">
        <td className="px-4 py-2 text-xs font-semibold">{label}</td>
        <td className="px-4 py-2 text-right text-xs text-muted-foreground" colSpan={rows.cy.length + (showTotal ? 1 : 0)}>
          CY (Actuals+Forecast) vs LY vs Budget
        </td>
      </tr>
      <RollupRow label="CY" values={rows.cy} total={rows.totals.cy} style={style} showTotal={showTotal} />
      <RollupRow label="LY" values={rows.ly} total={rows.totals.ly} style={style} showTotal={showTotal} />
      <RollupRow label="Budget" values={rows.bud} total={rows.totals.bud} style={style} showTotal={showTotal} />
    </>
  );
}

function RollupRow({
  label,
  values,
  total,
  style,
  showTotal,
}: {
  label: string;
  values: number[];
  total: number;
  style: "currency" | "number";
  showTotal: boolean;
}) {
  return (
    <tr className="border-t">
      <td className="px-4 py-2 text-xs font-medium text-muted-foreground">{label}</td>
      {values.map((v, idx) => (
        <td key={idx} className="px-4 py-2 text-right text-xs tabular-nums">
          {formatNumber(v, { style })}
        </td>
      ))}
      {showTotal ? (
        <td className="px-4 py-2 text-right text-xs font-semibold tabular-nums">
          {formatNumber(total, { style })}
        </td>
      ) : null}
    </tr>
  );
}
