"use client";

import * as React from "react";
import { FiltersBar, type Filters } from "@/components/tpm/filters-bar";
import { createPublix2026Mock } from "@/lib/tpm/mockPublix2026";
import { formatNumber, sum } from "@/lib/tpm/fiscal";

function periodToQuarter(periodIndex0: number) {
  // P1-P3 => Q1, P4-P6 => Q2, P7-P9 => Q3, P10-P12 => Q4
  return Math.floor(periodIndex0 / 3);
}

export default function InsightsPage() {
  const [filters, setFilters] = React.useState<Filters>({
    retailer: "Publix",
    division: "Atlanta Division",
    year: 2026,
  });

  // MVP: use existing mock series (until DB-backed rollups land).
  const mock = React.useMemo(() => createPublix2026Mock(), []);

  const quarters = React.useMemo(() => {
    const make = (values12: number[]) => {
      const q = [0, 0, 0, 0];
      for (let i = 0; i < 12; i++) q[periodToQuarter(i)] += values12[i] ?? 0;
      return q;
    };

    return {
      budgetSalesQ: make(mock.sales.budget),
      actualSalesQ: make(mock.sales.actual),
      budgetVolQ: make(mock.volume.budget),
      actualVolQ: make(mock.volume.actual),
      budgetSpendQ: make(mock.spend.budget),
      actualSpendQ: make(mock.spend.actual),
    };
  }, [mock]);

  const cards = React.useMemo(() => {
    const salesBud = sum(mock.sales.budget);
    const salesAct = sum(mock.sales.actual);
    const volBud = sum(mock.volume.budget);
    const volAct = sum(mock.volume.actual);
    const spendBud = sum(mock.spend.budget);
    const spendAct = sum(mock.spend.actual);
    return [
      { title: "Retail Sales", bud: salesBud, act: salesAct, style: "currency" as const },
      { title: "Volume (Cases)", bud: volBud, act: volAct, style: "number" as const },
      { title: "Trade Spend", bud: spendBud, act: spendAct, style: "currency" as const },
    ];
  }, [mock]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-lg font-semibold tracking-tight">Insights</div>
            <div className="text-sm text-muted-foreground">
              Periods roll up into quarters (P1–P3 = Q1, etc.). Managers will see team totals here.
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Sparkling view: quick rollups + clean drilldown
          </div>
        </div>
      </div>

      <FiltersBar value={filters} onChange={setFilters} />

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

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-semibold tracking-tight">Quarter Rollup</div>
          <div className="text-xs text-muted-foreground">
            This will be driven by Postgres rollups + manager/team mappings (next).
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground">Metric</th>
                {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                  <th key={q} className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {q}
                  </th>
                ))}
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">Year</th>
              </tr>
            </thead>
            <tbody>
              <QuarterRow label="Sales (Budget)" values={quarters.budgetSalesQ} style="currency" />
              <QuarterRow label="Sales (Actuals)" values={quarters.actualSalesQ} style="currency" />
              <QuarterRow label="Volume (Budget)" values={quarters.budgetVolQ} style="number" />
              <QuarterRow label="Volume (Actuals)" values={quarters.actualVolQ} style="number" />
              <QuarterRow label="Trade Spend (Budget)" values={quarters.budgetSpendQ} style="currency" />
              <QuarterRow label="Trade Spend (Actuals)" values={quarters.actualSpendQ} style="currency" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function QuarterRow({
  label,
  values,
  style,
}: {
  label: string;
  values: number[];
  style: "currency" | "number";
}) {
  return (
    <tr className="border-t">
      <td className="px-4 py-2 text-xs font-medium">{label}</td>
      {values.map((v, idx) => (
        <td key={idx} className="px-4 py-2 text-right text-xs tabular-nums">
          {formatNumber(v, { style })}
        </td>
      ))}
      <td className="px-4 py-2 text-right text-xs font-semibold tabular-nums">
        {formatNumber(sum(values), { style })}
      </td>
    </tr>
  );
}

