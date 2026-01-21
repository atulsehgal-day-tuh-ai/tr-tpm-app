"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function KpiTile({
  title,
  value,
  footnote,
  chip,
  tone = "sky",
  placeholder = false,
}: {
  title: string;
  value: string;
  footnote?: string;
  chip?: string;
  tone?: "sky" | "emerald" | "indigo" | "amber" | "pink";
  placeholder?: boolean;
}) {
  const toneStyles =
    tone === "emerald"
      ? { bar: "from-emerald-500 via-emerald-400 to-emerald-300", chip: "bg-emerald-500/10 text-emerald-800" }
      : tone === "indigo"
      ? { bar: "from-indigo-500 via-indigo-400 to-indigo-300", chip: "bg-indigo-500/10 text-indigo-800" }
      : tone === "amber"
      ? { bar: "from-amber-500 via-amber-400 to-amber-300", chip: "bg-amber-500/10 text-amber-900" }
      : tone === "pink"
      ? { bar: "from-fuchsia-500 via-pink-500 to-rose-400", chip: "bg-pink-500/10 text-pink-900" }
      : { bar: "from-sky-500 via-cyan-400 to-emerald-400", chip: "bg-sky-500/10 text-sky-900" };

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", toneStyles.bar)} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground">{title}</div>
          <div className={cn("mt-1 text-2xl font-semibold tracking-tight tabular-nums", placeholder && "text-muted-foreground")}>
            {value}
          </div>
          {footnote ? <div className="mt-1 text-xs text-muted-foreground">{footnote}</div> : null}
        </div>
        {chip ? (
          <div className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", toneStyles.chip)}>
            {chip}
          </div>
        ) : null}
      </div>
    </div>
  );
}

