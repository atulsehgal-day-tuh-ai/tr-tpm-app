"use client";

import * as React from "react";

import { Filters, FiltersBar } from "@/components/tpm/filters-bar";
import { TpmGrid } from "@/components/tpm/tpm-grid";

export function TpmPlanner() {
  const [filters, setFilters] = React.useState<Filters>({
    retailer: "Publix",
    division: "Atlanta Division",
    year: 2026,
  });

  return (
    <div className="space-y-3">
      <FiltersBar value={filters} onChange={setFilters} />
      <TpmGrid filters={filters} />
    </div>
  );
}

