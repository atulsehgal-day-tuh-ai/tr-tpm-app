"use client";

import * as React from "react";
import { KpiTile } from "@/components/ui/kpi-tile";
import { formatNumber, getCurrentPeriodIndexForYear, sum } from "@/lib/tpm/fiscal";
import { BASE_PRICE, PROMO_PRICE } from "@/components/tpm/tpm-grid";
import type { PromoType, Publix2026Mock } from "@/lib/tpm/mockPublix2026";

function clamp12(values: number[]) {
  if (values.length === 12) return values;
  return Array.from({ length: 12 }, (_, i) => values[i] ?? 0);
}

function pctDiff(numer: number, denom: number) {
  const d = denom || 1;
  return numer / d;
}

export function GridKpis({
  filters,
  mock,
  forecastPromo,
}: {
  filters: { retailer: string; division: string; year: number };
  mock: Publix2026Mock;
  forecastPromo: Record<PromoType, number[]>;
}) {
  const currentPeriodIndex = React.useMemo(
    () => getCurrentPeriodIndexForYear(filters.year),
    [filters.year]
  );

  const forecastTotalVolume = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) =>
      (forecastPromo.Frontline[i] ?? 0) +
      (forecastPromo["10/$10"][i] ?? 0) +
      (forecastPromo.B2G1[i] ?? 0)
    );
  }, [forecastPromo]);

  const forecastSales = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const frontline = (forecastPromo.Frontline[i] ?? 0) * BASE_PRICE;
      const promo =
        ((forecastPromo["10/$10"][i] ?? 0) + (forecastPromo.B2G1[i] ?? 0)) * PROMO_PRICE;
      return frontline + promo;
    });
  }, [forecastPromo]);

  const forecastSpend = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const frontline = (forecastPromo.Frontline[i] ?? 0) * 0.35;
      const tenForTen = (forecastPromo["10/$10"][i] ?? 0) * 2.1;
      const b2g1 = (forecastPromo.B2G1[i] ?? 0) * 2.6;
      return frontline + tenForTen + b2g1;
    });
  }, [forecastPromo]);

  const budSales = React.useMemo(() => clamp12(mock.sales.budget), [mock.sales.budget]);
  const actSales = React.useMemo(() => clamp12(mock.sales.actual), [mock.sales.actual]);
  const budSpend = React.useMemo(() => clamp12(mock.spend.budget), [mock.spend.budget]);
  const actSpend = React.useMemo(() => clamp12(mock.spend.actual), [mock.spend.actual]);
  const actVol = React.useMemo(() => clamp12(mock.volume.actual), [mock.volume.actual]);
  const lyVol = React.useMemo(() => clamp12(mock.volume.lastYear), [mock.volume.lastYear]);

  const ytdEnd = Math.max(0, currentPeriodIndex); // 0..11; -1 => 0 periods
  const sumUpTo = (arr: number[]) => sum(arr.slice(0, ytdEnd));

  const salesFcstVsBudPct = pctDiff(sum(forecastSales) - sum(budSales), sum(budSales));
  const spendFcstVsBud = sum(forecastSpend) - sum(budSpend);
  const spendYtdActVsBud = sumUpTo(actSpend) - sumUpTo(budSpend);
  const volYtdVsLyPct = pctDiff(sumUpTo(actVol) - sumUpTo(lyVol), sumUpTo(lyVol));

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <KpiTile
        title="Sales %Δ (Forecast vs Budget)"
        value={formatNumber(salesFcstVsBudPct, { style: "percent" })}
        footnote="FY total"
        chip="Grid row: Sales %Δ"
        tone="sky"
      />
      <KpiTile
        title="Spend Δ$ (Forecast vs Budget)"
        value={formatNumber(spendFcstVsBud, { style: "currency" })}
        footnote="FY total"
        chip="Grid row: Spend Δ"
        tone="indigo"
      />
      <KpiTile
        title="Spend Δ$ (YTD Actual vs Budget)"
        value={formatNumber(spendYtdActVsBud, { style: "currency" })}
        footnote={`YTD through P${ytdEnd}`}
        chip="Grid row: Spend Δ (YTD)"
        tone="amber"
      />
      <KpiTile
        title="Volume %Δ (YTD vs Last Year)"
        value={formatNumber(volYtdVsLyPct, { style: "percent" })}
        footnote={`YTD through P${ytdEnd}`}
        chip="Grid row: Volume %Δ vs LY"
        tone="emerald"
      />
    </div>
  );
}

