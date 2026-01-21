"use client";

import * as React from "react";

import { Filters, FiltersBar } from "@/components/tpm/filters-bar";
import { TpmGrid } from "@/components/tpm/tpm-grid";
import { GridKpis } from "@/components/tpm/grid-kpis";
import { PromoType, createPublix2026Mock } from "@/lib/tpm/mockPublix2026";

export function TpmPlanner() {
  const [filters, setFilters] = React.useState<Filters>({
    retailer: "Publix",
    division: "Atlanta Division",
    year: 2026,
  });

  // MVP data source (mock) — will be replaced by DB-backed rollups later.
  const mock = React.useMemo(() => {
    const base = createPublix2026Mock();
    return { ...base, division: filters.division };
  }, [filters.division]);

  const clamp12 = React.useCallback((values: number[]) => {
    if (values.length === 12) return values;
    return Array.from({ length: 12 }, (_, i) => values[i] ?? 0);
  }, []);

  const [forecastPromo, setForecastPromo] = React.useState<Record<PromoType, number[]>>(() => ({
    Frontline: clamp12(mock.volume.forecastPromo.Frontline),
    "10/$10": clamp12(mock.volume.forecastPromo["10/$10"]),
    B2G1: clamp12(mock.volume.forecastPromo.B2G1),
  }));

  // When the selected retailer/division/year changes, reset the editable forecast seed.
  React.useEffect(() => {
    setForecastPromo({
      Frontline: clamp12(mock.volume.forecastPromo.Frontline),
      "10/$10": clamp12(mock.volume.forecastPromo["10/$10"]),
      B2G1: clamp12(mock.volume.forecastPromo.B2G1),
    });
  }, [filters.retailer, filters.division, filters.year, mock.volume.forecastPromo, clamp12]);

  return (
    <div className="space-y-3">
      <FiltersBar value={filters} onChange={setFilters} />
      <GridKpis filters={filters} mock={mock} forecastPromo={forecastPromo} />
      <TpmGrid filters={filters} forecastPromo={forecastPromo} setForecastPromo={setForecastPromo} />
    </div>
  );
}

