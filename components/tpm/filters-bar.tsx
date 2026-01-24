"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import * as React from "react";

export type Filters = {
  retailerDivision: string;
  ppg: string;
  year: number;
};

export function FiltersBar({
  value,
  onChange,
  token,
  allowAllPpg = false,
  requirePpg = false,
  excludePpgs = [],
}: {
  value: Filters;
  onChange: (next: Filters) => void;
  token?: string | null;
  allowAllPpg?: boolean;
  requirePpg?: boolean;
  excludePpgs?: string[];
}) {
  const [opts, setOpts] = React.useState<{
    retailerDivisions: string[];
    ppgs: string[];
    years: number[];
  }>({
    retailerDivisions: [],
    ppgs: [],
    years: [],
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
        const rd = (json.retailerDivisions || []).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b));
        const ppgs = (json.ppgs || []).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b));
        const years = (json.years || []).filter(Boolean).sort((a: number, b: number) => a - b);
        setOpts({ retailerDivisions: rd, ppgs, years });
      } catch {
        // ignore; keep empty (no dummy options)
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, value.year]);

  // If selection is empty/invalid, choose the first available option (data-driven).
  React.useEffect(() => {
    if (!opts.retailerDivisions.length) return;
    if (!value.retailerDivision || !opts.retailerDivisions.includes(value.retailerDivision)) {
      onChange({ ...value, retailerDivision: opts.retailerDivisions[0] });
    }
  }, [opts.retailerDivisions, value, onChange]);

  React.useEffect(() => {
    if (!opts.years.length) return;
    if (!Number.isFinite(value.year) || !opts.years.includes(value.year)) {
      onChange({ ...value, year: opts.years[0] });
    }
  }, [opts.years, value, onChange]);

  // Ensure required PPG is set to something valid.
  React.useEffect(() => {
    if (!requirePpg) return;
    const filtered = opts.ppgs.filter((p) => !excludePpgs.includes(p));
    const valid = filtered.includes(value.ppg);
    if (!value.ppg || !valid || value.ppg === "__ALL__") {
      const nextPpg = filtered[0] ?? "";
      // Avoid infinite loops: only update when value actually changes.
      if (nextPpg !== value.ppg) {
        onChange({ ...value, ppg: nextPpg });
      }
    }
  }, [requirePpg, opts.ppgs, excludePpgs, value, onChange]);

  const ppgOptions = React.useMemo(() => {
    return opts.ppgs.filter((p) => !excludePpgs.includes(p));
  }, [opts.ppgs, excludePpgs]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white/80 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex items-center gap-2">
        <div className="text-[11px] font-medium text-muted-foreground">Retailer-Division</div>
        <div className="w-[320px]">
          <Select
            value={value.retailerDivision}
            onValueChange={(retailerDivision) => onChange({ ...value, retailerDivision })}
            disabled={!token || opts.retailerDivisions.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={!token ? "Sign in to load" : "No data loaded"} />
            </SelectTrigger>
            <SelectContent>
              {opts.retailerDivisions.length ? (
                opts.retailerDivisions.map((rd) => (
                  <SelectItem key={rd} value={rd}>
                    {rd}
                  </SelectItem>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">No data loaded</div>
              )}
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
            disabled={!token || ppgOptions.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={!token ? "Sign in to load" : "No data loaded"} />
            </SelectTrigger>
            <SelectContent>
              {allowAllPpg ? (
                <SelectItem value="__ALL__">All PPGs</SelectItem>
              ) : null}
              {ppgOptions.length ? (
                ppgOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">No data loaded</div>
              )}
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
            disabled={!token || opts.years.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={!token ? "Sign in" : "No data"} />
            </SelectTrigger>
            <SelectContent>
              {opts.years.length ? (
                opts.years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">No data loaded</div>
              )}
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

