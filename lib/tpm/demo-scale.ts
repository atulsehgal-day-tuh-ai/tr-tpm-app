import type { Publix2026Mock, PromoType } from "@/lib/tpm/mockPublix2026";
import { round0 } from "@/lib/tpm/fiscal";

export function demoScaleFactor(key: string) {
  // Deterministic, fast hash for demo-only scaling (not crypto).
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const t = (h >>> 0) / 4294967295; // 0..1
  return 0.85 + t * 0.3; // 0.85..1.15
}

function scaleArr(arr: number[], factor: number) {
  return arr.map((v) => round0(v * factor));
}

export function scalePublixMockForDemo(base: Publix2026Mock, factor: number): Publix2026Mock {
  const promoTypes: PromoType[] = ["Frontline", "10/$10", "B2G1"];
  const nextPromo: any = {};
  for (const p of promoTypes) nextPromo[p] = scaleArr(base.volume.forecastPromo[p], factor);

  return {
    ...base,
    volume: {
      ...base.volume,
      actual: scaleArr(base.volume.actual, factor),
      budget: scaleArr(base.volume.budget, factor),
      lastYear: scaleArr(base.volume.lastYear, factor),
      forecastPromo: nextPromo,
    },
    sales: {
      ...base.sales,
      actual: scaleArr(base.sales.actual, factor),
      budget: scaleArr(base.sales.budget, factor),
    },
    spend: {
      ...base.spend,
      actual: scaleArr(base.spend.actual, factor),
      budget: scaleArr(base.spend.budget, factor),
    },
  };
}

