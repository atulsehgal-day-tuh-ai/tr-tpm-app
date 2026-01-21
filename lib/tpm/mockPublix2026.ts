import { round0 } from "@/lib/tpm/fiscal";

type Series = number[];

export type PromoType = "Frontline" | "10/$10" | "B2G1";

export type Publix2026Mock = {
  retailer: "Publix";
  year: 2026;
  division: string;
  volume: {
    actual: Series;
    budget: Series;
    lastYear: Series;
    forecastPromo: Record<PromoType, Series>; // editable inputs live in UI state; this is a starter seed
  };
  spend: {
    actual: Series;
    budget: Series;
  };
  sales: {
    actual: Series;
    budget: Series;
  };
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genSeasonality12(rand: () => number, base: number, volatility = 0.08): Series {
  // Mild seasonality: higher in summer and year-end
  const season = [0.96, 0.94, 0.98, 1.0, 1.05, 1.1, 1.18, 1.15, 1.06, 1.02, 1.08, 1.12];
  return season.map((s) => {
    const noise = 1 + (rand() * 2 - 1) * volatility;
    return round0(base * s * noise);
  });
}

function scale(series: Series, factor: number, volatility = 0.02, rand?: () => number): Series {
  const r = rand ?? Math.random;
  return series.map((v) => round0(v * factor * (1 + (r() * 2 - 1) * volatility)));
}

export function createPublix2026Mock(): Publix2026Mock {
  const rand = mulberry32(20260126);

  // Volume in cases
  const budgetVol = genSeasonality12(rand, 24000, 0.06);
  const lastYearVol = scale(budgetVol, 0.95, 0.04, rand);
  const actualVol = scale(budgetVol, 0.98, 0.05, rand);

  // Forecast promo breakdown: frontline is the bulk, promos are smaller but meaningful
  const frontline = scale(budgetVol, 0.78, 0.05, rand);
  const promo10 = scale(budgetVol, 0.14, 0.06, rand);
  const b2g1 = scale(budgetVol, 0.08, 0.06, rand);

  // Sales and spend derived from volume with rough economics
  const basePrice = 20;
  const blendedBudgetPrice = 17.8; // budget blend
  const blendedActualPrice = 17.5; // actual blend
  const budgetSales = budgetVol.map((v) => round0(v * blendedBudgetPrice));
  const actualSales = actualVol.map((v) => round0(v * blendedActualPrice));

  const budgetSpend = budgetSales.map((s) => round0(s * (0.105 + rand() * 0.02))); // 10.5–12.5%
  const actualSpend = actualSales.map((s) => round0(s * (0.108 + rand() * 0.02)));

  return {
    retailer: "Publix",
    year: 2026,
    division: "Atlanta Division",
    volume: {
      actual: actualVol,
      budget: budgetVol,
      lastYear: lastYearVol,
      forecastPromo: {
        Frontline: frontline,
        "10/$10": promo10,
        B2G1: b2g1,
      },
    },
    spend: {
      actual: actualSpend,
      budget: budgetSpend,
    },
    sales: {
      actual: actualSales,
      budget: budgetSales,
    },
  };
}

