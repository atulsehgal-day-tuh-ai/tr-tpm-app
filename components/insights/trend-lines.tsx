"use client";

import { formatNumber } from "@/lib/tpm/fiscal";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pathForSeries({
  data,
  w,
  h,
  pad,
  minV,
  maxV,
}: {
  data: number[];
  w: number;
  h: number;
  pad: number;
  minV: number;
  maxV: number;
}) {
  const denom = maxV - minV || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const pts = data.map((v, i) => {
    const x = pad + (i * innerW) / Math.max(1, data.length - 1);
    const t = (v - minV) / denom;
    const y = pad + (1 - clamp(t, 0, 1)) * innerH;
    return { x, y };
  });
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

export function TrendLines({
  labels,
  cyTotal,
  ly,
  cutoffIndex,
  unit,
}: {
  labels: string[];
  cyTotal: number[];
  ly: number[];
  cutoffIndex: number | null;
  unit: "currency" | "number";
}) {
  const n = Math.max(labels.length, cyTotal.length, ly.length);
  const cy = Array.from({ length: n }, (_, i) => cyTotal[i] ?? 0);
  const last = Array.from({ length: n }, (_, i) => ly[i] ?? 0);

  const vals = [...cy, ...last].filter((v) => Number.isFinite(v));
  const minV = vals.length ? Math.min(...vals) : 0;
  const maxV = vals.length ? Math.max(...vals) : 1;

  const w = 720;
  const h = 180;
  const pad = 12;
  const dCy = pathForSeries({ data: cy, w, h, pad, minV, maxV });
  const dLy = pathForSeries({ data: last, w, h, pad, minV, maxV });

  const innerW = w - pad * 2;
  const cutoffX =
    cutoffIndex == null
      ? null
      : pad + (clamp(cutoffIndex, 0, Math.max(1, n - 1)) * innerW) / Math.max(1, n - 1);

  const lastLabel = labels[Math.max(0, n - 1)] ?? "";
  const cyEnd = cy[Math.max(0, n - 1)] ?? 0;
  const lyEnd = last[Math.max(0, n - 1)] ?? 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg className="h-[180px] w-full min-w-[680px]" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="rgb(226 232 240)" strokeWidth="1" />

        {cutoffX != null ? (
          <line
            x1={cutoffX}
            x2={cutoffX}
            y1={pad}
            y2={h - pad}
            stroke="rgb(148 163 184)"
            strokeDasharray="4 4"
          />
        ) : null}

        <path d={dLy} fill="none" stroke="rgb(139 92 246)" strokeWidth="2.5" opacity="0.95" />
        <path d={dCy} fill="none" stroke="rgb(2 132 199)" strokeWidth="3" />

        <title>
          {lastLabel} • CY {formatNumber(cyEnd, { style: unit })} • LY {formatNumber(lyEnd, { style: unit })}
        </title>
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-600" />
            CY (Actuals+Forecast)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
            Last year
          </span>
          {cutoffX != null ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[2px] w-4 bg-slate-400" style={{ clipPath: "inset(0 0 0 0)" }} />
              Cutoff (last completed week)
            </span>
          ) : null}
        </div>
        <div>
          End: CY <span className="font-medium text-foreground">{formatNumber(cyEnd, { style: unit })}</span> • LY{" "}
          <span className="font-medium text-foreground">{formatNumber(lyEnd, { style: unit })}</span>
        </div>
      </div>
    </div>
  );
}
