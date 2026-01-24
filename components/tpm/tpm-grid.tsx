"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  formatDateRange,
  formatIsoWeekRange,
  formatNumber,
  getCurrentPeriodIndexForYear,
  getFiscalPeriodsForYear,
  sum,
} from "@/lib/tpm/fiscal";
import { PromoType, Publix2026Mock } from "@/lib/tpm/mockPublix2026";

type CellStyle = "currency" | "number" | "percent";

type RowKind =
  | "section"
  | "actual"
  | "budget"
  | "forecast"
  | "diff"
  | "pct"
  | "ly"
  | "promo";

type GridRow = {
  id: string;
  label: string;
  kind: RowKind;
  style: CellStyle;
  values: number[];
  subRows?: GridRow[];
  meta?: {
    locked?: boolean;
    editable?: boolean;
    indent?: number;
    note?: string;
    promoType?: PromoType;
  };
};

export const BASE_PRICE = 20;
export const PROMO_PRICE = 10;

function clamp12(values: number[]) {
  if (values.length === 12) return values;
  return Array.from({ length: 12 }, (_, i) => values[i] ?? 0);
}

function zeros12() {
  return Array.from({ length: 12 }, () => 0);
}

function useZeroMock(filters: { retailer: string; division: string; year: number; demoKey: string }) {
  return React.useMemo<Publix2026Mock>(() => {
    const z = zeros12();
    return {
      retailer: "Publix",
      year: 2026,
      division: filters.division || "",
      volume: {
        actual: z,
        budget: z,
        lastYear: z,
        forecastPromo: {
          Frontline: z,
          "10/$10": z,
          B2G1: z,
        },
      },
      spend: { actual: z, budget: z },
      sales: { actual: z, budget: z },
    };
  }, [filters.division]);
}

export function TpmGrid({
  filters,
  forecastPromo,
  setForecastPromo,
}: {
  filters: { retailer: string; division: string; year: number; demoKey: string };
  forecastPromo: Record<PromoType, number[]>;
  setForecastPromo: React.Dispatch<React.SetStateAction<Record<PromoType, number[]>>>;
}) {
  const mock = useZeroMock(filters);

  // Derived series
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
        ((forecastPromo["10/$10"][i] ?? 0) + (forecastPromo.B2G1[i] ?? 0)) *
        PROMO_PRICE;
      return frontline + promo;
    });
  }, [forecastPromo]);

  const forecastSpend = React.useMemo(() => {
    // Simple placeholder: spend driven mostly by promo volume
    return Array.from({ length: 12 }, (_, i) => {
      const frontline = (forecastPromo.Frontline[i] ?? 0) * 0.35; // base allowance
      const tenForTen = (forecastPromo["10/$10"][i] ?? 0) * 2.1;
      const b2g1 = (forecastPromo.B2G1[i] ?? 0) * 2.6;
      return frontline + tenForTen + b2g1;
    });
  }, [forecastPromo]);

  const currentPeriodIndex = React.useMemo(
    () => getCurrentPeriodIndexForYear(filters.year),
    [filters.year]
  );

  const periods = React.useMemo(() => getFiscalPeriodsForYear(filters.year), [filters.year]);

  const salesDifference = React.useMemo(() => {
    const bud = clamp12(mock.sales.budget);
    const act = clamp12(mock.sales.actual);
    return Array.from({ length: 12 }, (_, i) => {
      const baseline = i < currentPeriodIndex ? act[i] : forecastSales[i];
      return baseline - bud[i];
    });
  }, [mock.sales.actual, mock.sales.budget, forecastSales, currentPeriodIndex]);

  const salesPctChange = React.useMemo(() => {
    const bud = clamp12(mock.sales.budget);
    return Array.from({ length: 12 }, (_, i) => {
      const denom = bud[i] || 1;
      return salesDifference[i] / denom;
    });
  }, [mock.sales.budget, salesDifference]);

  const rows = React.useMemo<GridRow[]>(() => {
    const budSales = clamp12(mock.sales.budget);
    const actSales = clamp12(mock.sales.actual);

    const budVol = clamp12(mock.volume.budget);
    const actVol = clamp12(mock.volume.actual);
    const lyVol = clamp12(mock.volume.lastYear);

    const budSpend = clamp12(mock.spend.budget);
    const actSpend = clamp12(mock.spend.actual);

    const spendDiffFcstBud = Array.from({ length: 12 }, (_, i) => (forecastSpend[i] ?? 0) - (budSpend[i] ?? 0));
    const spendPctFcstBud = Array.from({ length: 12 }, (_, i) => {
      const denom = budSpend[i] || 1;
      return spendDiffFcstBud[i] / denom;
    });

    const spendDiffActBud = Array.from({ length: 12 }, (_, i) => (actSpend[i] ?? 0) - (budSpend[i] ?? 0));
    const spendPctActBud = Array.from({ length: 12 }, (_, i) => {
      const denom = budSpend[i] || 1;
      return spendDiffActBud[i] / denom;
    });

    const volDiffActLy = Array.from({ length: 12 }, (_, i) => (actVol[i] ?? 0) - (lyVol[i] ?? 0));
    const volPctActLy = Array.from({ length: 12 }, (_, i) => {
      const denom = lyVol[i] || 1;
      return volDiffActLy[i] / denom;
    });

    const salesDiffFcstBud = Array.from({ length: 12 }, (_, i) => (forecastSales[i] ?? 0) - (budSales[i] ?? 0));
    const salesPctFcstBud = Array.from({ length: 12 }, (_, i) => {
      const denom = budSales[i] || 1;
      return salesDiffFcstBud[i] / denom;
    });

    const promoRow = (id: string, label: string, promo: PromoType): GridRow => ({
      id,
      label,
      kind: "promo",
      style: "number",
      values: forecastPromo[promo],
      meta: { editable: true, indent: 2, promoType: promo, note: "Editable forecast input" },
    });

    return [
      {
        id: "sec-sales",
        label: "Retail Sales $",
        kind: "section",
        style: "currency",
        values: Array(12).fill(0),
      },
      { id: "sales-act", label: "Actuals", kind: "actual", style: "currency", values: actSales },
      {
        id: "sales-bud",
        label: "Budget",
        kind: "budget",
        style: "currency",
        values: budSales,
        meta: { locked: true },
      },
      {
        id: "sales-fcst",
        label: "Forecast",
        kind: "forecast",
        style: "currency",
        values: forecastSales,
      },
      {
        id: "sales-diff",
        label: "$ Difference (Act/Fcst - Bud)",
        kind: "diff",
        style: "currency",
        values: salesDifference,
      },
      {
        id: "sales-pct",
        label: "% Change (Act/Fcst - Bud)",
        kind: "pct",
        style: "percent",
        values: salesPctChange,
      },
      {
        id: "sales-pct-fcst-bud",
        label: "%Δ (Forecast - Budget)",
        kind: "pct",
        style: "percent",
        values: salesPctFcstBud,
      },

      {
        id: "sec-vol",
        label: "Volume (Cases)",
        kind: "section",
        style: "number",
        values: Array(12).fill(0),
      },
      { id: "vol-act", label: "Actual Cases", kind: "actual", style: "number", values: actVol },
      {
        id: "vol-bud",
        label: "Budget Cases",
        kind: "budget",
        style: "number",
        values: budVol,
        meta: { locked: true },
      },
      {
        id: "vol-fcst",
        label: "Forecast Cases",
        kind: "forecast",
        style: "number",
        values: forecastTotalVolume,
        meta: { indent: 1, note: "Derived = sum of promo mechanics" },
        subRows: [
          promoRow("vol-fcst-frontline", "Frontline (Base Price)", "Frontline"),
          promoRow("vol-fcst-10for10", "10/$10 Promo", "10/$10"),
          promoRow("vol-fcst-b2g1", "Buy 2 Get 1 (B2G1)", "B2G1"),
        ],
      },
      { id: "vol-ly", label: "LY Cases (Last Year)", kind: "ly", style: "number", values: lyVol },
      { id: "vol-diff-ly", label: "Δ Cases (Actual - LY)", kind: "diff", style: "number", values: volDiffActLy },
      { id: "vol-pct-ly", label: "%Δ (Actual - LY)", kind: "pct", style: "percent", values: volPctActLy },

      {
        id: "sec-spend",
        label: "Trade Spend $",
        kind: "section",
        style: "currency",
        values: Array(12).fill(0),
      },
      { id: "spend-act", label: "Actual Spend", kind: "actual", style: "currency", values: actSpend },
      {
        id: "spend-bud",
        label: "Budget Spend",
        kind: "budget",
        style: "currency",
        values: budSpend,
        meta: { locked: true },
      },
      {
        id: "spend-fcst",
        label: "Forecast Spend",
        kind: "forecast",
        style: "currency",
        values: forecastSpend,
      },
      {
        id: "spend-diff-fcst-bud",
        label: "$Δ (Forecast - Budget)",
        kind: "diff",
        style: "currency",
        values: spendDiffFcstBud,
      },
      {
        id: "spend-pct-fcst-bud",
        label: "%Δ (Forecast - Budget)",
        kind: "pct",
        style: "percent",
        values: spendPctFcstBud,
      },
      {
        id: "spend-diff-act-bud",
        label: "$Δ (Actual - Budget)",
        kind: "diff",
        style: "currency",
        values: spendDiffActBud,
      },
      {
        id: "spend-pct-act-bud",
        label: "%Δ (Actual - Budget)",
        kind: "pct",
        style: "percent",
        values: spendPctActBud,
      },
    ];
  }, [
    mock.sales.budget,
    mock.sales.actual,
    mock.volume.budget,
    mock.volume.actual,
    mock.volume.lastYear,
    mock.spend.budget,
    mock.spend.actual,
    forecastPromo,
    forecastSales,
    forecastTotalVolume,
    forecastSpend,
    salesDifference,
    salesPctChange,
  ]);

  type RowT = GridRow;

  const columns = React.useMemo<ColumnDef<RowT>[]>(() => {
    const metricCol: ColumnDef<RowT> = {
      id: "metric",
      header: () => (
        <div className="text-[11px] font-semibold text-muted-foreground">
          Metric / Row Header
        </div>
      ),
      cell: ({ row }) => {
        const r = row.original;
        const indent = r.meta?.indent ?? 0;
        const isSection = r.kind === "section";
        const canExpand = row.getCanExpand();
        const isExpanded = row.getIsExpanded();
        return (
          <div
            className={cn(
              "flex items-center gap-2 whitespace-nowrap",
              isSection && "font-semibold tracking-wide text-[11px] text-muted-foreground"
            )}
            style={{ paddingLeft: indent * 14 }}
          >
            {canExpand ? (
              <button
                className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onClick={row.getToggleExpandedHandler()}
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            {isSection ? <span className="h-2 w-2 rounded-sm bg-primary/60" /> : null}
            <span>{r.label}</span>
            {r.meta?.locked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : null}
          </div>
        );
      },
    };

    const periodCols: ColumnDef<RowT>[] = periods.map((p, idx) => ({
      id: p.key,
      header: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help text-center leading-tight">
              <div className="text-[11px] font-semibold">{p.key}</div>
              <div className="text-[10px] text-muted-foreground">
                {p.monthShort} • {p.weeks}w
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <div className="font-medium">
              {p.key} ({p.monthShort})
            </div>
            <div className="mt-0.5 text-muted-foreground">
              {formatIsoWeekRange(p.isoWeekStart, p.isoWeekEnd)}
            </div>
            <div className="mt-1">{formatDateRange(p.startDate, p.endDate)}</div>
          </TooltipContent>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const r = row.original;
        if (r.kind === "section") return null;

        const val = r.values[idx] ?? 0;

        const isEditable = r.meta?.editable && r.kind === "promo" && !!r.meta?.promoType;
        if (isEditable) {
          return (
            <Input
              className={cn(
                "h-7 rounded-sm px-1.5 text-right text-xs shadow-none",
                "border border-border bg-amber-50/70",
                "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
              )}
              inputMode="numeric"
              value={String(val)}
              onChange={(e) => {
                const next = Number(e.target.value.replace(/[^0-9.-]/g, "")) || 0;
                const promo = r.meta!.promoType!;
                setForecastPromo((prev) => ({
                  ...prev,
                  [promo]: prev[promo].map((v, i) => (i === idx ? next : v)),
                }));
              }}
            />
          );
        }

        const formatted = formatNumber(val, { style: r.style });
        const isDiff = r.kind === "diff";
        const diffColor =
          isDiff && val < 0 ? "text-red-600" : isDiff && val > 0 ? "text-emerald-700" : "";
        const locked = r.meta?.locked;
        const isCurrent = idx === currentPeriodIndex;

        return (
          <div
            className={cn(
              "text-right text-xs tabular-nums",
              locked && "text-muted-foreground",
              diffColor,
              isCurrent && "font-medium"
            )}
          >
            {formatted}
          </div>
        );
      },
    }));

    const totalCol: ColumnDef<RowT> = {
      id: "total",
      header: () => (
        <div className="text-center leading-tight">
          <div className="text-[11px] font-semibold">Total</div>
          <div className="text-[10px] text-muted-foreground">Year</div>
        </div>
      ),
      cell: ({ row }) => {
        const r = row.original;
        if (r.kind === "section") return null;
        const total = sum(r.values);
        const formatted = formatNumber(total, { style: r.style });
        const isDiff = r.kind === "diff";
        const diffColor =
          isDiff && total < 0 ? "text-red-600" : isDiff && total > 0 ? "text-emerald-700" : "";
        const locked = r.meta?.locked;
        return (
          <div className={cn("text-right text-xs font-semibold tabular-nums", locked && "text-muted-foreground", diffColor)}>
            {formatted}
          </div>
        );
      },
    };

    return [metricCol, ...periodCols, totalCol];
  }, [currentPeriodIndex, periods, setForecastPromo]);

  const table = useReactTable({
    data: rows,
    columns,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: {
      expanded: { "vol-fcst": true },
    },
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-xl border bg-white shadow-sm">
      <div className="relative overflow-hidden border-b px-4 py-2.5">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-white to-emerald-50" />
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-sky-400 to-emerald-400" />
        <div className="relative flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold tracking-tight">
          Leading Indicators — {filters.retailer} • {filters.division} • {filters.year}
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">Budget/Actuals locked</span>{" "}
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-900">Promo mechanics editable</span>{" "}
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">Totals pinned</span>
        </div>
        </div>
      </div>

      <div className="isolate overflow-auto">
        <table className="tpm-grid w-max min-w-full text-sm">
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === headerGroup.headers.length - 1;
                  const isTotal = isLast;
                  const isCurrent =
                    header.id.startsWith("P") &&
                    periods[currentPeriodIndex]?.key === (header.id as any);
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-2 py-2 text-left align-bottom text-xs",
                        "sticky top-0 z-10 bg-slate-50 text-slate-700",
                        "shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]",
                        isFirst &&
                          "sticky left-0 z-30 bg-slate-50 shadow-[2px_0_12px_rgba(0,0,0,0.08)]",
                        isLast &&
                          "sticky right-0 z-30 bg-slate-50 shadow-[-2px_0_12px_rgba(0,0,0,0.08)]",
                        isTotal && "bg-slate-100",
                        isCurrent && "bg-primary/10 text-slate-900",
                      )}
                      style={{ minWidth: isFirst ? 300 : 110 }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, rowIndex) => {
              const r = row.original;
              const isSection = r.kind === "section";
              const locked = r.meta?.locked;
              const zebra = rowIndex % 2 === 1;
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "hover:bg-muted/30",
                    !isSection && zebra && "bg-muted/10",
                    isSection && "bg-gradient-to-r from-muted/60 to-white",
                    locked && !isSection && "bg-muted/20"
                  )}
                >
                  {row.getVisibleCells().map((cell, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === row.getVisibleCells().length - 1;
                    const isTotal = isLast;
                    const isEditablePromo =
                      row.original.kind === "promo" && row.original.meta?.editable;
                    const isCurrentPeriodCell =
                      !isFirst &&
                      !isLast &&
                      row.original.kind !== "section" &&
                      idx - 1 === currentPeriodIndex;
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-2 py-1 align-middle",
                          isSection && "py-2",
                          isEditablePromo && "bg-amber-50/40",
                          isCurrentPeriodCell && "bg-primary/5",
                          // Sticky cells must be fully opaque (no alpha) to prevent overlap/bleed-through.
                          isFirst && "sticky left-0 z-20",
                          isFirst && !isSection && !locked && zebra && "bg-slate-50",
                          isFirst && !isSection && !locked && !zebra && "bg-white",
                          isFirst && locked && "bg-slate-50",
                          isFirst && isSection && "bg-slate-100",
                          isFirst && "shadow-[2px_0_12px_rgba(0,0,0,0.06)]",
                          isLast && "sticky right-0 z-20 shadow-[-2px_0_12px_rgba(0,0,0,0.06)]",
                          isLast && !isSection && !locked && zebra && "bg-slate-50",
                          isLast && !isSection && !locked && !zebra && "bg-white",
                          isLast && locked && "bg-slate-50",
                          isLast && isSection && "bg-slate-100",
                          isTotal && "bg-slate-50",
                        )}
                        style={{ minWidth: isFirst ? 300 : 110 }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t bg-white/70 px-4 py-2 text-[11px] text-muted-foreground">
        Assumptions: Base price ${BASE_PRICE}, promo price ${PROMO_PRICE}. Difference uses Actuals for periods before the current month; otherwise Forecast.
      </div>
      </div>
    </TooltipProvider>
  );
}

