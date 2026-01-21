"use client";

import { formatNumber } from "@/lib/tpm/fiscal";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function GroupedStackedBars({
  labels,
  cyActual,
  cyForecast,
  budget,
  lastYear,
  unit,
}: {
  labels: string[];
  cyActual: number[];
  cyForecast: number[];
  budget: number[];
  lastYear: number[];
  unit: "currency" | "number";
}) {
  const n = Math.max(labels.length, cyActual.length, cyForecast.length, budget.length, lastYear.length);
  const cyTotal = Array.from({ length: n }, (_, i) => (cyActual[i] ?? 0) + (cyForecast[i] ?? 0));
  const maxV = Math.max(
    1,
    ...cyTotal,
    ...budget.map((v) => v ?? 0),
    ...lastYear.map((v) => v ?? 0)
  );

  const w = 720;
  const h = 220;
  const padL = 26;
  const padR = 10;
  const padT = 8;
  const padB = 32;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  // For each bucket: 3 bars (CY stacked, Budget, LY)
  const groupW = innerW / Math.max(1, n);
  const gap = clamp(groupW * 0.10, 4, 10);
  const barW = clamp((groupW - gap * 2) / 3, 6, 18);

  const y = (v: number) => padT + (1 - clamp(v / maxV, 0, 1)) * innerH;
  const barH = (v: number) => clamp((v / maxV) * innerH, 0, innerH);

  return (
    <div className="w-full overflow-x-auto">
      <svg className="h-[220px] w-full min-w-[680px]" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {/* axis line */}
        <line x1={padL} x2={w - padR} y1={padT + innerH} y2={padT + innerH} stroke="rgb(226 232 240)" strokeWidth="1" />

        {Array.from({ length: n }).map((_, i) => {
          const gx = padL + i * groupW;
          const x0 = gx + gap;

          const a = cyActual[i] ?? 0;
          const f = cyForecast[i] ?? 0;
          const b = budget[i] ?? 0;
          const ly = lastYear[i] ?? 0;

          const cyX = x0;
          const budX = x0 + barW + gap;
          const lyX = x0 + (barW + gap) * 2;

          const aH = barH(a);
          const fH = barH(f);
          const cyH = barH(a + f);

          const baseY = padT + innerH;

          return (
            <g key={i}>
              {/* CY stacked */}
              <rect
                x={cyX}
                y={baseY - cyH}
                width={barW}
                height={cyH}
                rx="3"
                fill="rgb(56 189 248)" // sky-400
                opacity="0.35"
              >
                <title>
                  {labels[i] ?? `#${i + 1}`} • CY total {formatNumber(a + f, { style: unit })}
                </title>
              </rect>
              <rect
                x={cyX}
                y={baseY - aH}
                width={barW}
                height={aH}
                rx="3"
                fill="rgb(14 165 233)" // sky-500
              >
                <title>
                  {labels[i] ?? `#${i + 1}`} • Actuals {formatNumber(a, { style: unit })} • Forecast {formatNumber(f, { style: unit })}
                </title>
              </rect>
              {f > 0 ? (
                <rect
                  x={cyX}
                  y={baseY - cyH}
                  width={barW}
                  height={fH}
                  rx="3"
                  fill="rgb(16 185 129)" // emerald-500
                />
              ) : null}

              {/* Budget */}
              <rect
                x={budX}
                y={baseY - barH(b)}
                width={barW}
                height={barH(b)}
                rx="3"
                fill="rgb(148 163 184)" // slate-400
              >
                <title>
                  {labels[i] ?? `#${i + 1}`} • Budget {formatNumber(b, { style: unit })}
                </title>
              </rect>

              {/* Last year */}
              <rect
                x={lyX}
                y={baseY - barH(ly)}
                width={barW}
                height={barH(ly)}
                rx="3"
                fill="rgb(139 92 246)" // violet-500
                opacity="0.9"
              >
                <title>
                  {labels[i] ?? `#${i + 1}`} • Last year {formatNumber(ly, { style: unit })}
                </title>
              </rect>

              {/* x label */}
              <text
                x={gx + groupW / 2}
                y={h - 12}
                textAnchor="middle"
                fontSize="10"
                fill="rgb(100 116 139)"
              >
                {labels[i] ?? ""}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Each bucket shows: <span className="font-medium text-foreground">CY</span> (stacked Actuals+Forecast), <span className="font-medium text-foreground">Budget</span>, and{" "}
        <span className="font-medium text-foreground">Last year</span>.
      </div>
    </div>
  );
}

