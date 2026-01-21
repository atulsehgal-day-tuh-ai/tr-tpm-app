"use client";

import { formatNumber } from "@/lib/tpm/fiscal";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function prefixSum(arr: number[]) {
  const out = new Array<number>(arr.length);
  let acc = 0;
  for (let i = 0; i < arr.length; i++) {
    acc += arr[i] ?? 0;
    out[i] = acc;
  }
  return out;
}

function pathForSeries({
  data,
  w,
  h,
  pad,
  minV,
  maxV,
  startIndex = 0,
}: {
  data: number[];
  w: number;
  h: number;
  pad: number;
  minV: number;
  maxV: number;
  startIndex?: number;
}) {
  const denom = maxV - minV || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const n = data.length;

  const pts = data.map((v, i) => {
    const x = pad + ((startIndex + i) * innerW) / Math.max(1, n - 1);
    const t = (v - minV) / denom;
    const y = pad + (1 - clamp(t, 0, 1)) * innerH;
    return { x, y };
  });

  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

export function BucketTrendLines({
  labels,
  cyActual,
  cyForecast,
  lastYear,
  cutoffBucketIndex,
  unit,
  cumulative,
}: {
  labels: string[];
  cyActual: number[];
  cyForecast: number[];
  lastYear: number[];
  cutoffBucketIndex: number | null;
  unit: "currency" | "number";
  cumulative: boolean;
}) {
  const n = Math.max(labels.length, cyActual.length, cyForecast.length, lastYear.length);
  const cyTotalRaw = Array.from({ length: n }, (_, i) => (cyActual[i] ?? 0) + (cyForecast[i] ?? 0));
  const lyRaw = Array.from({ length: n }, (_, i) => lastYear[i] ?? 0);

  const cyTotal = cumulative ? prefixSum(cyTotalRaw) : cyTotalRaw;
  const ly = cumulative ? prefixSum(lyRaw) : lyRaw;

  const vals = [...cyTotal, ...ly].filter((v) => Number.isFinite(v));
  const minV = vals.length ? Math.min(...vals) : 0;
  const maxV = vals.length ? Math.max(...vals) : 1;

  const w = 720;
  const h = 210;
  const pad = 12;
  const innerW = w - pad * 2;

  const cutoffX =
    cutoffBucketIndex == null
      ? null
      : pad + (clamp(cutoffBucketIndex, 0, Math.max(1, n - 1)) * innerW) / Math.max(1, n - 1);

  const dLy = pathForSeries({ data: ly, w, h, pad, minV, maxV });

  // CY: one line, but styled solid before cutoff and dashed after cutoff to imply forecast.
  const cutoff = cutoffBucketIndex == null ? n - 1 : clamp(cutoffBucketIndex, 0, n - 1);
  const cySolid = cyTotal.slice(0, cutoff + 1);
  const cyDashed = cutoff + 1 < n ? cyTotal.slice(cutoff, n) : [];

  const dCySolid = pathForSeries({ data: cySolid, w, h, pad, minV, maxV });
  const dCyDashed =
    cyDashed.length >= 2 ? pathForSeries({ data: cyDashed, w, h, pad, minV, maxV, startIndex: cutoff }) : "";

  const cyEnd = cyTotal[n - 1] ?? 0;
  const lyEnd = ly[n - 1] ?? 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg className="h-[210px] w-full min-w-[680px]" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {/* baseline */}
        <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="rgb(226 232 240)" strokeWidth="1" />

        {/* cutoff marker */}
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

        {/* LY */}
        <path d={dLy} fill="none" stroke="rgb(139 92 246)" strokeWidth="2.5" opacity="0.95" />

        {/* CY solid */}
        <path d={dCySolid} fill="none" stroke="rgb(2 132 199)" strokeWidth="3" />

        {/* CY dashed (forecast segment) */}
        {dCyDashed ? (
          <path d={dCyDashed} fill="none" stroke="rgb(2 132 199)" strokeWidth="3" strokeDasharray="6 5" opacity="0.95" />
        ) : null}

        <title>
          End • CY {formatNumber(cyEnd, { style: unit })} • LY {formatNumber(lyEnd, { style: unit })}
        </title>
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-600" />
            CY {cumulative ? "cumulative" : "by bucket"} (solid→dashed after cutoff)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
            LY {cumulative ? "cumulative" : "by bucket"}
          </span>
          {cutoffX != null ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[2px] w-4 bg-slate-400" style={{ clipPath: "inset(0 0 0 0)" }} />
              Cutoff
            </span>
          ) : null}
        </div>
        <div className="hidden md:block">
          {labels.length ? (
            <>
              Last bucket: <span className="font-medium text-foreground">{labels[labels.length - 1]}</span> • CY{" "}
              <span className="font-medium text-foreground">{formatNumber(cyEnd, { style: unit })}</span> • LY{" "}
              <span className="font-medium text-foreground">{formatNumber(lyEnd, { style: unit })}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

