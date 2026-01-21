"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import * as React from "react";

export type Filters = {
  retailerDivision: string;
  ppg: string;
  year: number;
};

const fallbackRetailerDivisions = [
  "Publix — Atlanta Division",
  "Publix — Florida Division",
  "Kroger — Cincinnati Division",
  "Kroger — Atlanta Division",
];

const fallbackPpgs = [
  "Talking Rain Company Total",
  "Sparkling Ice Core SS 17oz Bottles",
  "Sparkling Ice Branded 12 Packs",
];

const years = [2025, 2026, 2027, 2028];

export function FiltersBar({
  value,
  onChange,
  token,
  allowAllPpg = false,
  requirePpg = false,
}: {
  value: Filters;
  onChange: (next: Filters) => void;
  token?: string | null;
  allowAllPpg?: boolean;
  requirePpg?: boolean;
}) {
  const [opts, setOpts] = React.useState<{ retailerDivisions: string[]; ppgs: string[] }>({
    retailerDivisions: fallbackRetailerDivisions,
    ppgs: fallbackPpgs,
  });

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) return;
      try {
        const qs = new URLSearchParams({ year: String(value.year) });
        const res = await fetch(`/api/dimensions/actuals?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok || !json.ok) return;
        if (cancelled) return;
        const rd = (json.retailerDivisions || []).filter(Boolean);
        const ppgs = (json.ppgs || []).filter(Boolean);
        setOpts({
          retailerDivisions: rd.length ? rd : fallbackRetailerDivisions,
          ppgs: ppgs.length ? ppgs : fallbackPpgs,
        });
      } catch {
        // ignore; fall back to defaults
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, value.year]);

  // Ensure required PPG is set to something valid.
  React.useEffect(() => {
    if (!requirePpg) return;
    const valid = opts.ppgs.includes(value.ppg);
    if (!value.ppg || !valid) {
      onChange({ ...value, ppg: opts.ppgs[0] ?? "" });
    }
  }, [requirePpg, opts.ppgs, value, onChange]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white/80 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex items-center gap-2">
        <div className="text-[11px] font-medium text-muted-foreground">Retailer-Division</div>
        <div className="w-[320px]">
          <Select
            value={value.retailerDivision}
            onValueChange={(retailerDivision) => onChange({ ...value, retailerDivision })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select retailer-division" />
            </SelectTrigger>
            <SelectContent>
              {opts.retailerDivisions.map((rd) => (
                <SelectItem key={rd} value={rd}>
                  {rd}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator orientation="vertical" className="h-7" />

      <div className="flex items-center gap-2">
        <div className="text-[11px] font-medium text-muted-foreground">PPG</div>
        <div className="w-[320px]">
          <Select
            value={value.ppg}
            onValueChange={(ppg) => onChange({ ...value, ppg })}
          >
            <SelectTrigger>
              <SelectValue placeholder={requirePpg ? "Select PPG (required)" : "Select PPG"} />
            </SelectTrigger>
            <SelectContent>
              {allowAllPpg ? (
                <SelectItem value="__ALL__">All PPGs</SelectItem>
              ) : null}
              {opts.ppgs.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator orientation="vertical" className="h-7" />

      <div className="flex items-center gap-2">
        <div className="text-[11px] font-medium text-muted-foreground">Year</div>
        <div className="w-[120px]">
          <Select
            value={String(value.year)}
            onValueChange={(y) => onChange({ ...value, year: Number(y) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="ml-auto hidden text-xs text-muted-foreground md:block">
        4-4-5 fiscal periods • high-density spreadsheet
      </div>
    </div>
  );
}

