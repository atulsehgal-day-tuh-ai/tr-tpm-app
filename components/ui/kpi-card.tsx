"use client";

import * as React from "react";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function KpiCard({
  title,
  value,
  sublabel,
  deltaPct,
  spark,
  accent = "sky",
}: {
  title: string;
  value: string;
  sublabel?: string;
  deltaPct?: number | null;
  spark?: number[];
  accent?: "sky" | "emerald" | "indigo" | "amber";
}) {
  const positive = (deltaPct ?? 0) >= 0;

  const accentMap = {
    sky: {
      ring: "ring-sky-400/25",
      chip: "bg-sky-500/10 text-sky-700",
      stroke: "stroke-sky-500",
      fill: "fill-sky-500/12",
    },
    emerald: {
      ring: "ring-emerald-400/25",
      chip: "bg-emerald-500/10 text-emerald-700",
      stroke: "stroke-emerald-500",
      fill: "fill-emerald-500/12",
    },
    indigo: {
      ring: "ring-indigo-400/25",
      chip: "bg-indigo-500/10 text-indigo-700",
      stroke: "stroke-indigo-500",
      fill: "fill-indigo-500/12",
    },
    amber: {
      ring: "ring-amber-400/25",
      chip: "bg-amber-500/10 text-amber-800",
      stroke: "stroke-amber-500",
      fill: "fill-amber-500/12",
    },
  }[accent];

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-white/70 p-4 shadow-sm backdrop-blur",
        "hover:bg-white/80 hover:shadow-md transition-shadow",
        "ring-1 ring-transparent",
        accentMap.ring
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{title}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </div>
          {sublabel ? (
            <div className="mt-1 text-xs text-muted-foreground">{sublabel}</div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          {typeof deltaPct === "number" ? (
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium",
                positive ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {Math.abs(deltaPct).toFixed(1)}%
            </div>
          ) : (
            <div className={cn("rounded-full px-2 py-1 text-[11px] font-medium", accentMap.chip)}>
              Live
            </div>
          )}

          {spark?.length ? (
            <Sparkline data={spark} strokeClassName={accentMap.stroke} fillClassName={accentMap.fill} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

