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
import { cn } from "@/lib/utils";
import { fiscalPeriods, formatNumber, getCurrentPeriodIndexForYear, sum } from "@/lib/tpm/fiscal";
import { PromoType, Publix2026Mock, createPublix2026Mock } from "@/lib/tpm/mockPublix2026";

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

const BASE_PRICE = 20;
const PROMO_PRICE = 10;

function clamp12(values: number[]) {
  if (values.length === 12) return values;
  return Array.from({ length: 12 }, (_, i) => values[i] ?? 0);
}

function usePublixMock(filters: { retailer: string; division: string; year: number }) {
  // For this initial build, we only generate realistic mock data for Publix 2026.
  // Other filters can be extended later.
  return React.useMemo<Publix2026Mock>(() => {
    const base = createPublix2026Mock();
    return { ...base, division: filters.division };
  }, [filters.division]);
}

export function TpmGrid({
  filters,
}: {
  filters: { retailer: string; division: string; year: number };
}) {
  const mock = usePublixMock(filters);

  const [forecastPromo, setForecastPromo] = React.useState<Record<PromoType, number[]>>(() => ({
    Frontline: clamp12(mock.volume.forecastPromo.Frontline),
    "10/$10": clamp12(mock.volume.forecastPromo["10/$10"]),
    B2G1: clamp12(mock.volume.forecastPromo.B2G1),
  }));

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
        label: "% Change",
        kind: "pct",
        style: "percent",
        values: salesPctChange,
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
            <span>{r.label}</span>
            {r.meta?.locked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : null}
          </div>
        );
      },
    };

    const periodCols: ColumnDef<RowT>[] = fiscalPeriods.map((p, idx) => ({
      id: p.key,
      header: () => (
        <div className="text-center leading-tight">
          <div className="text-[11px] font-semibold">{p.key}</div>
          <div className="text-[10px] text-muted-foreground">
            {p.monthShort} • {p.weeks}w
          </div>
        </div>
      ),
      cell: ({ row }) => {
        const r = row.original;
        if (r.kind === "section") return null;

        const val = r.values[idx] ?? 0;

        const isEditable = r.meta?.editable && r.kind === "promo" && !!r.meta?.promoType;
        if (isEditable) {
          return (
            <Input
              className="h-7 rounded-sm border-border bg-white px-1.5 text-right text-xs shadow-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
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

        return (
          <div
            className={cn(
              "text-right text-xs tabular-nums",
              locked && "text-muted-foreground",
              diffColor
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
          isDiff && total < 0 ? "text-red-600" : isDiff && total > 0 ? "text-green-700" : "";
        const locked = r.meta?.locked;
        return (
          <div className={cn("text-right text-xs font-medium tabular-nums", locked && "text-muted-foreground", diffColor)}>
            {formatted}
          </div>
        );
      },
    };

    return [metricCol, ...periodCols, totalCol];
  }, []);

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
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-white/70 px-4 py-2.5">
        <div className="text-sm font-semibold tracking-tight">
          TPM Planner — {filters.retailer} • {filters.division} • {filters.year}
        </div>
        <div className="text-xs text-muted-foreground">
          Budget/Actuals locked • Promo mechanics editable • Totals pinned right
        </div>
      </div>

      <div className="overflow-auto">
        <table className="tpm-grid w-max min-w-full text-sm">
          <thead className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === headerGroup.headers.length - 1;
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-2 py-2 text-left align-bottom text-xs",
                        "sticky top-0 z-10 bg-muted/40",
                        isFirst && "sticky left-0 z-30 bg-muted/40",
                        isLast && "sticky right-0 z-30 bg-muted/40",
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
                    isSection && "bg-muted/60",
                    locked && !isSection && "bg-muted/20"
                  )}
                >
                  {row.getVisibleCells().map((cell, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === row.getVisibleCells().length - 1;
                    const isEditablePromo =
                      row.original.kind === "promo" && row.original.meta?.editable;
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-2 py-1 align-middle",
                          isSection && "py-2",
                          isEditablePromo && "bg-white",
                          isFirst && "sticky left-0 z-10 bg-white",
                          isFirst && !isSection && zebra && "bg-muted/10",
                          isFirst && isSection && "bg-muted/60",
                          isFirst && locked && "bg-muted/20",
                          isLast && "sticky right-0 z-10 bg-white",
                          isLast && !isSection && zebra && "bg-muted/10",
                          isLast && isSection && "bg-muted/60",
                          isLast && locked && "bg-muted/20",
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
  );
}

