"use client";

import { formatNumber } from "@/lib/tpm/fiscal";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatAbbrev(n: number, unit: "currency" | "number") {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const fmt = (v: number) => (v % 1 === 0 ? String(v) : v.toFixed(1));

  if (abs >= 1_000_000_000) return `${sign}${unit === "currency" ? "$" : ""}${fmt(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${unit === "currency" ? "$" : ""}${fmt(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${unit === "currency" ? "$" : ""}${fmt(abs / 1_000)}K`;
  return unit === "currency" ? formatNumber(n, { style: "currency" }) : formatNumber(n, { style: "number" });
}

function niceStep(rawStep: number) {
  const exp = Math.floor(Math.log10(rawStep));
  const f = rawStep / Math.pow(10, exp);
  let nf = 1;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 2.5) nf = 2.5;
  else if (f <= 5) nf = 5;
  else nf = 10;
  return nf * Math.pow(10, exp);
}

function niceCeil(n: number) {
  if (n === 0) return 0;
  const exp = Math.floor(Math.log10(n));
  const f = n / Math.pow(10, exp);
  let nf = 1;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 2.5) nf = 2.5;
  else if (f <= 5) nf = 5;
  else nf = 10;
  return nf * Math.pow(10, exp);
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
  const xLabels = Array.from({ length: n }, (_, i) => (labels[i] ?? "").split(" ")[0] ?? "");
  const cyTotalRaw = Array.from({ length: n }, (_, i) => (cyActual[i] ?? 0) + (cyForecast[i] ?? 0));
  const lyRaw = Array.from({ length: n }, (_, i) => lastYear[i] ?? 0);

  const cyTotal = cumulative ? prefixSum(cyTotalRaw) : cyTotalRaw;
  const ly = cumulative ? prefixSum(lyRaw) : lyRaw;

  const vals = [...cyTotal, ...ly].filter((v) => Number.isFinite(v));
  const minVRaw = vals.length ? Math.min(...vals) : 0;
  const maxVRaw = vals.length ? Math.max(...vals) : 1;
  const minV = Math.min(0, minVRaw); // keep baseline visible
  const maxV = Math.max(1, maxVRaw);

  const w = 720;
  const h = 210;
  const padL = 48; // room for y-axis ticks
  const padR = 16;
  const padT = 10;
  const padB = 34; // room for x-axis ticks
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const cutoffX =
    cutoffBucketIndex == null
      ? null
      : padL + (clamp(cutoffBucketIndex, 0, Math.max(1, n - 1)) * innerW) / Math.max(1, n - 1);

  const dLy = pathForSeries({ data: ly, w, h, pad: padT, minV, maxV, startIndex: 0 });

  // CY: one line, but styled solid before cutoff and dashed after cutoff to imply forecast.
  const cutoff = cutoffBucketIndex == null ? n - 1 : clamp(cutoffBucketIndex, 0, n - 1);
  const cySolid = cyTotal.slice(0, cutoff + 1);
  const cyDashed = cutoff + 1 < n ? cyTotal.slice(cutoff, n) : [];

  const dCySolid = pathForSeries({ data: cySolid, w, h, pad: padT, minV, maxV });
  const dCyDashed =
    cyDashed.length >= 2 ? pathForSeries({ data: cyDashed, w, h, pad: padT, minV, maxV, startIndex: cutoff }) : "";

  const cyEnd = cyTotal[n - 1] ?? 0;
  const lyEnd = ly[n - 1] ?? 0;

  // Y-axis ticks (nice)
  const tickCount = 5;
  const niceMax = niceCeil(maxV);
  const step = niceStep((niceMax - minV) / Math.max(1, tickCount - 1));
  const yStart = 0;
  const yEnd = Math.ceil(niceMax / step) * step;
  const ticks = Array.from({ length: tickCount }, (_, i) => yStart + i * ((yEnd - yStart) / Math.max(1, tickCount - 1)));

  const yFor = (v: number) => {
    const denom = (yEnd - minV) || 1;
    const t = (v - minV) / denom;
    return padT + (1 - clamp(t, 0, 1)) * innerH;
  };

  const xForIndex = (i: number) => padL + (i * innerW) / Math.max(1, n - 1);
  const axisY = padT + innerH;

  return (
    <div className="w-full overflow-x-auto">
      <svg className="h-[210px] w-full min-w-[680px]" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {/* y gridlines + y tick labels */}
        {ticks.map((tv, idx) => {
          const yy = yFor(tv);
          return (
            <g key={idx}>
              <line x1={padL} x2={w - padR} y1={yy} y2={yy} stroke="rgb(226 232 240)" strokeWidth="1" />
              <text
                x={padL - 8}
                y={yy + 3}
                textAnchor="end"
                fontSize="10"
                fill="rgb(100 116 139)"
              >
                {formatAbbrev(tv, unit)}
              </text>
            </g>
          );
        })}

        {/* baseline */}
        <line x1={padL} x2={w - padR} y1={axisY} y2={axisY} stroke="rgb(226 232 240)" strokeWidth="1.5" />

        {/* cutoff marker */}
        {cutoffX != null ? (
          <line
            x1={cutoffX}
            x2={cutoffX}
            y1={padT}
            y2={axisY}
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
          <path
            d={dCyDashed}
            fill="none"
            stroke="rgb(16 185 129)" /* emerald-500 */
            strokeWidth="3"
            strokeDasharray="6 5"
            opacity="0.95"
          />
        ) : null}

        {/* x tick labels */}
        {xLabels.map((xl, i) => {
          const x = xForIndex(i);
          const rotate = n > 6 ? -35 : 0;
          const y = h - 10;
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={rotate ? "end" : "middle"}
              fontSize="10"
              fill="rgb(100 116 139)"
              transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
            >
              {xl}
            </text>
          );
        })}

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

