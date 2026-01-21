"use client";

import { cn } from "@/lib/utils";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function Sparkline({
  data,
  className,
  height = 32,
  strokeClassName = "stroke-sky-500",
  fillClassName = "fill-sky-500/15",
}: {
  data: number[];
  className?: string;
  height?: number;
  strokeClassName?: string;
  fillClassName?: string;
}) {
  const w = 120;
  const h = height;
  const pad = 2;

  // Keep this component hook-free (helps avoid hook-order issues in complex pages).
  const vals = data.filter((v) => Number.isFinite(v));
  const minV = vals.length ? Math.min(...vals) : 0;
  const maxV = vals.length ? Math.max(...vals) : 1;
  const denom = maxV - minV || 1;

  const points = data.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
    const t = (v - minV) / denom;
    const y = pad + (1 - clamp(t, 0, 1)) * (h - pad * 2);
    return { x, y };
  });

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const area = `${d} L ${points[points.length - 1]?.x ?? w} ${h - pad} L ${points[0]?.x ?? pad} ${h - pad} Z`;

  return (
    <svg
      className={cn("h-8 w-[120px]", className)}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
    >
      <path className={cn(fillClassName)} d={area} />
      <path className={cn("fill-none stroke-[2.5]", strokeClassName)} d={d} />
    </svg>
  );
}

