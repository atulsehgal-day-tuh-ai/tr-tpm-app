"use client";

import * as React from "react";

import { Filters, FiltersBar } from "@/components/tpm/filters-bar";
import { TpmGrid } from "@/components/tpm/tpm-grid";
import { GridKpis } from "@/components/tpm/grid-kpis";
import { PromoType, createPublix2026Mock } from "@/lib/tpm/mockPublix2026";
import { Button } from "@/components/ui/button";
import { useIdToken } from "@/components/auth/use-id-token";
import { cn } from "@/lib/utils";
import { demoScaleFactor, scalePublixMockForDemo } from "@/lib/tpm/demo-scale";

function clamp12(values: number[]) {
  if (values.length === 12) return values;
  return Array.from({ length: 12 }, (_, i) => values[i] ?? 0);
}

function normalizeForecastPromo(fp: Record<PromoType, number[]>) {
  return {
    Frontline: clamp12(fp.Frontline ?? []),
    "10/$10": clamp12(fp["10/$10"] ?? []),
    B2G1: clamp12(fp.B2G1 ?? []),
  } as Record<PromoType, number[]>;
}

function deepEqualForecastPromo(a: Record<PromoType, number[]>, b: Record<PromoType, number[]>) {
  const keys: PromoType[] = ["Frontline", "10/$10", "B2G1"];
  for (const k of keys) {
    const aa = a[k] ?? [];
    const bb = b[k] ?? [];
    for (let i = 0; i < 12; i++) {
      if ((aa[i] ?? 0) !== (bb[i] ?? 0)) return false;
    }
  }
  return true;
}

function isoDateTimeShort(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  if (!Number.isFinite(dt.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(dt);
}

function parseRetailerDivision(retailerDivision: string) {
  const parts = retailerDivision.split("—").map((s) => s.trim());
  if (parts.length >= 2) return { retailer: parts[0], division: parts.slice(1).join(" — ") };
  return { retailer: retailerDivision.trim(), division: "" };
}

export function TpmPlanner() {
  const { token } = useIdToken();
  const [filters, setFilters] = React.useState<Filters>({
    retailerDivision: "Publix — Atlanta Division",
    ppg: "Talking Rain Company Total",
    year: 2026,
  });

  const parsed = React.useMemo(() => parseRetailerDivision(filters.retailerDivision), [filters.retailerDivision]);
  const demoKey = React.useMemo(() => `${filters.retailerDivision}||${filters.ppg}||${filters.year}`, [filters.retailerDivision, filters.ppg, filters.year]);

  // MVP data source (mock) — will be replaced by DB-backed rollups later.
  const mock = React.useMemo(() => {
    const base = createPublix2026Mock();
    const withDiv = { ...base, division: parsed.division || base.division };
    return scalePublixMockForDemo(withDiv, demoScaleFactor(demoKey));
  }, [parsed.division, demoKey]);

  const [forecastPromo, setForecastPromo] = React.useState<Record<PromoType, number[]>>(() => ({
    Frontline: clamp12(mock.volume.forecastPromo.Frontline),
    "10/$10": clamp12(mock.volume.forecastPromo["10/$10"]),
    B2G1: clamp12(mock.volume.forecastPromo.B2G1),
  }));

  const [draftSavedAt, setDraftSavedAt] = React.useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const lastSavedRef = React.useRef<Record<PromoType, number[]> | null>(null);
  const isDirty = React.useMemo(() => {
    const baseline = lastSavedRef.current;
    if (!baseline) return true;
    return !deepEqualForecastPromo(forecastPromo, baseline);
  }, [forecastPromo]);

  // When the selected retailer/division/year changes, reset the editable forecast seed.
  React.useEffect(() => {
    setForecastPromo(normalizeForecastPromo(mock.volume.forecastPromo));
    lastSavedRef.current = null;
    setDraftSavedAt(null);
    setSubmittedAt(null);
    setSaveError(null);
  }, [filters.retailerDivision, filters.ppg, filters.year, mock.volume.forecastPromo]);

  // Load latest draft/submitted when filters change (and user is authed).
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setSaveError(null);
      if (!token) return;
      try {
        const qs = new URLSearchParams({
          retailer: parsed.retailer,
          division: parsed.division,
          ppg: filters.ppg,
          year: String(filters.year),
        });
        const res = await fetch(`/api/forecast/latest?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load forecast");
        if (cancelled) return;

        const draft = json.draft;
        const submitted = json.submitted;

        if (draft?.data?.forecastPromo) {
          const next = normalizeForecastPromo(draft.data.forecastPromo);
          setForecastPromo(next);
          lastSavedRef.current = next;
          setDraftSavedAt(draft.savedAt || null);
        } else {
          // No draft -> treat current mock as baseline (dirty until saved).
          lastSavedRef.current = normalizeForecastPromo(mock.volume.forecastPromo);
          setDraftSavedAt(null);
        }

        setSubmittedAt(submitted?.submittedAt || null);
      } catch (e: any) {
        if (!cancelled) setSaveError(e?.message || "Failed to load forecast");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, parsed.retailer, parsed.division, filters.ppg, filters.year, mock.volume.forecastPromo]);

  const saveDraft = React.useCallback(async () => {
    if (!token) {
      setSaveError("Sign in to save your draft.");
      return false;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/forecast/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          retailer: parsed.retailer,
          division: parsed.division,
          ppg: filters.ppg,
          year: filters.year,
          data: { forecastPromo },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to save draft");
      lastSavedRef.current = normalizeForecastPromo(forecastPromo);
      setDraftSavedAt(json.savedAt || new Date().toISOString());
      return true;
    } catch (e: any) {
      setSaveError(e?.message || "Failed to save draft");
      return false;
    } finally {
      setSaving(false);
    }
  }, [token, parsed.retailer, parsed.division, filters.ppg, filters.year, forecastPromo]);

  const submit = React.useCallback(async () => {
    if (!token) {
      setSaveError("Sign in to submit your forecast.");
      return;
    }
    setSubmitting(true);
    setSaveError(null);
    try {
      if (isDirty) {
        const ok = await saveDraft();
        if (!ok) throw new Error("Fix draft save errors before submitting.");
      }

      const res = await fetch("/api/forecast/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          retailer: parsed.retailer,
          division: parsed.division,
          ppg: filters.ppg,
          year: filters.year,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to submit");
      setSubmittedAt(json.submittedAt || new Date().toISOString());
    } catch (e: any) {
      setSaveError(e?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }, [token, parsed.retailer, parsed.division, filters.ppg, filters.year, isDirty, saveDraft]);

  return (
    <div className="space-y-3">
      <FiltersBar
        value={filters}
        onChange={setFilters}
        token={token}
        requirePpg
        excludePpgs={["Talking Rain Company Total"]}
      />

      <div className="rounded-xl border bg-white/80 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" disabled={saving || submitting} onClick={saveDraft}>
              {saving ? "Saving…" : "Save Draft"}
            </Button>
            <Button size="sm" disabled={submitting || saving} onClick={submit}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>

            <div className="ml-2 text-xs text-muted-foreground">
              {saveError ? (
                <span className="text-rose-600">{saveError}</span>
              ) : isDirty ? (
                <span className="font-medium text-amber-700">Unsaved changes</span>
              ) : draftSavedAt ? (
                <span>
                  Draft saved <span className="font-medium text-foreground">{isoDateTimeShort(draftSavedAt)}</span>
                </span>
              ) : (
                <span>Draft not saved yet</span>
              )}
              {submittedAt ? (
                <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                  Submitted {isoDateTimeShort(submittedAt)}
                </span>
              ) : (
                <span className="ml-2 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  Not submitted
                </span>
              )}
            </div>
          </div>
          <div className={cn("text-[11px] text-muted-foreground", !token && "text-rose-600")}>
            {token ? "Insights updates after you Save Draft." : "Sign in to enable Save Draft / Submit."}
          </div>
        </div>
      </div>

      <GridKpis
        filters={{ retailer: parsed.retailer, division: parsed.division, year: filters.year }}
        mock={mock}
        forecastPromo={forecastPromo}
      />
      <TpmGrid
        filters={{ retailer: parsed.retailer, division: parsed.division, year: filters.year, demoKey }}
        forecastPromo={forecastPromo}
        setForecastPromo={setForecastPromo}
      />
    </div>
  );
}

