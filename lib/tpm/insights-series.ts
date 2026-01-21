import { getFiscalPeriodsForYear, sum, type FiscalPeriod } from "@/lib/tpm/fiscal";
import type { Publix2026Mock } from "@/lib/tpm/mockPublix2026";

export type InsightsViewKey = "period" | "quarter" | "annual";

type MetricBlock = {
  cyActual: number[];
  cyForecast: number[];
  budget: number[];
  lastYear: number[];
};

type ViewBlock = {
  labels: string[];
  sales: MetricBlock;
  volume: MetricBlock;
  spend: MetricBlock;
};

function quarterOfPeriodIndex(periodIndex0: number) {
  return Math.floor(periodIndex0 / 3);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function lastCompletedSundayUtc(now = new Date()) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0..6 (Sun..Sat)
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

function buildWeeksFromPeriods(periods: FiscalPeriod[]) {
  const totalWeeks = periods[periods.length - 1]?.isoWeekEnd ?? 52;
  const weekToPeriodIndex = new Array<number>(totalWeeks).fill(0);
  const weekEndDates = new Array<Date>(totalWeeks);

  periods.forEach((p, pIdx) => {
    const weeks = p.isoWeekEnd - p.isoWeekStart + 1;
    for (let w = 0; w < weeks; w++) {
      const weekNumber = p.isoWeekStart + w; // 1-based ISO week index within year
      const idx0 = weekNumber - 1;
      weekToPeriodIndex[idx0] = pIdx;

      const weekStart = new Date(p.startDate);
      weekStart.setUTCDate(weekStart.getUTCDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      weekEndDates[idx0] = weekEnd;
    }
  });

  const labels = Array.from({ length: totalWeeks }, (_, i) => `W${String(i + 1).padStart(2, "0")}`);
  return { totalWeeks, weekToPeriodIndex, weekEndDates, labels };
}

function distributePeriodTotalsToWeeks(values12: number[], periods: FiscalPeriod[]) {
  const { totalWeeks } = buildWeeksFromPeriods(periods);
  const out = new Array<number>(totalWeeks).fill(0);

  periods.forEach((p, idx) => {
    const weeks = p.isoWeekEnd - p.isoWeekStart + 1;
    const total = values12[idx] ?? 0;
    const perWeek = weeks > 0 ? total / weeks : 0;
    for (let w = p.isoWeekStart; w <= p.isoWeekEnd; w++) {
      out[w - 1] = perWeek;
    }
  });

  return out;
}

function aggregateWeekly({
  weekly,
  bucketIndexByWeek,
  bucketCount,
}: {
  weekly: number[];
  bucketIndexByWeek: number[];
  bucketCount: number;
}) {
  const out = new Array<number>(bucketCount).fill(0);
  for (let i = 0; i < weekly.length; i++) out[bucketIndexByWeek[i] ?? 0] += weekly[i] ?? 0;
  return out;
}

function splitCyActualForecast({
  weeklyActualFull,
  weeklyForecastModel,
  cutoffIndex,
}: {
  weeklyActualFull: number[];
  weeklyForecastModel: number[];
  cutoffIndex: number | null;
}) {
  if (cutoffIndex == null) {
    return {
      cyActual: weeklyActualFull.map(() => 0),
      cyForecast: weeklyForecastModel.slice(),
    };
  }

  return {
    cyActual: weeklyActualFull.map((v, i) => (i <= cutoffIndex ? v : 0)),
    cyForecast: weeklyForecastModel.map((v, i) => (i > cutoffIndex ? v : 0)),
  };
}

export function buildMockInsightsSeries({
  mock,
  year,
  now,
}: {
  mock: Publix2026Mock;
  year: number;
  now?: Date;
}) {
  const periods = getFiscalPeriodsForYear(year);
  const { totalWeeks, weekToPeriodIndex, weekEndDates, labels: weekLabels } = buildWeeksFromPeriods(periods);

  const nowUtc = now ?? new Date();
  const currentYear = nowUtc.getUTCFullYear();
  const cutoffSundayUtc = lastCompletedSundayUtc(nowUtc);

  let cutoffIndex: number | null = null;
  if (year < currentYear) {
    cutoffIndex = totalWeeks - 1;
  } else if (year > currentYear) {
    cutoffIndex = null;
  } else {
    cutoffIndex = null;
    for (let i = 0; i < weekEndDates.length; i++) {
      const d = weekEndDates[i];
      if (d && d.getTime() <= cutoffSundayUtc.getTime()) cutoffIndex = i;
    }
  }

  const cutoffWeekEndDate = cutoffIndex == null ? null : isoDate(weekEndDates[cutoffIndex]);
  const nextWeekEndDate =
    cutoffIndex == null
      ? isoDate(weekEndDates[0] ?? cutoffSundayUtc)
      : cutoffIndex + 1 < weekEndDates.length
        ? isoDate(weekEndDates[cutoffIndex + 1])
        : null;

  // Period-based values (12) -> weekly (52/53)
  const weeklyBudgetVolume = distributePeriodTotalsToWeeks(mock.volume.budget, periods);
  const weeklyActualVolumeFull = distributePeriodTotalsToWeeks(mock.volume.actual, periods);
  const weeklyLastYearVolume = distributePeriodTotalsToWeeks(mock.volume.lastYear, periods);

  // Derive LY for sales/spend using volume ratio vs actual volume.
  const salesLastYearPeriods = mock.sales.actual.map((s, i) => {
    const denom = mock.volume.actual[i] ?? 0;
    const ratio = denom > 0 ? (mock.volume.lastYear[i] ?? 0) / denom : 1;
    return s * ratio;
  });
  const spendLastYearPeriods = mock.spend.actual.map((s, i) => {
    const denom = mock.volume.actual[i] ?? 0;
    const ratio = denom > 0 ? (mock.volume.lastYear[i] ?? 0) / denom : 1;
    return s * ratio;
  });

  const weeklyBudgetSales = distributePeriodTotalsToWeeks(mock.sales.budget, periods);
  const weeklyActualSalesFull = distributePeriodTotalsToWeeks(mock.sales.actual, periods);
  const weeklyLastYearSales = distributePeriodTotalsToWeeks(salesLastYearPeriods, periods);

  const weeklyBudgetSpend = distributePeriodTotalsToWeeks(mock.spend.budget, periods);
  const weeklyActualSpendFull = distributePeriodTotalsToWeeks(mock.spend.actual, periods);
  const weeklyLastYearSpend = distributePeriodTotalsToWeeks(spendLastYearPeriods, periods);

  // Forecast model: use budget as the forward-looking baseline.
  const splitSales = splitCyActualForecast({
    weeklyActualFull: weeklyActualSalesFull,
    weeklyForecastModel: weeklyBudgetSales,
    cutoffIndex,
  });
  const splitVolume = splitCyActualForecast({
    weeklyActualFull: weeklyActualVolumeFull,
    weeklyForecastModel: weeklyBudgetVolume,
    cutoffIndex,
  });
  const splitSpend = splitCyActualForecast({
    weeklyActualFull: weeklyActualSpendFull,
    weeklyForecastModel: weeklyBudgetSpend,
    cutoffIndex,
  });

  // Bucket mappings
  const periodLabels = periods.map((p) => `${p.key} ${p.monthShort}`);
  const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];
  const annualLabels = [`FY${year}`];

  const weekToQuarterIndex = weekToPeriodIndex.map((pIdx) => quarterOfPeriodIndex(pIdx));

  const buildView = (kind: InsightsViewKey): ViewBlock => {
    if (kind === "period") {
      const bucketCount = 12;
      return {
        labels: periodLabels,
        sales: {
          cyActual: aggregateWeekly({ weekly: splitSales.cyActual, bucketIndexByWeek: weekToPeriodIndex, bucketCount }),
          cyForecast: aggregateWeekly({ weekly: splitSales.cyForecast, bucketIndexByWeek: weekToPeriodIndex, bucketCount }),
          budget: aggregateWeekly({ weekly: weeklyBudgetSales, bucketIndexByWeek: weekToPeriodIndex, bucketCount }),
          lastYear: aggregateWeekly({ weekly: weeklyLastYearSales, bucketIndexByWeek: weekToPeriodIndex, bucketCount }),
        },
        volume: {
          cyActual: aggregateWeekly({ weekly: splitVolume.cyActual, bucketIndexByWeek: weekToPeriodIndex, bucketCount }),
          cyForecast: aggregateWeekly({ weekly: splitVolume.cyForecast, bucketIndexByWeek: weekToPeriodIndex, bucketCount }),
          budget: aggregateWeekly({ weekly: weeklyBudgetVolume, bucketIndexByWeek: weekToPeriodIndex, bucketCount }),
          lastYear: aggregateWeekly({ weekly: weeklyLastYearVolume, bucketIndexByWeek: weekToPeriodIndex, bucketCount }),
        },
        spend: {
          cyActual: aggregateWeekly({ weekly: splitSpend.cyActual, bucketIndexByWeek: weekToPeriodIndex, bucketCount }),
          cyForecast: aggregateWeekly({ weekly: splitSpend.cyForecast, bucketIndexByWeek: weekToPeriodIndex, bucketCount }),
          budget: aggregateWeekly({ weekly: weeklyBudgetSpend, bucketIndexByWeek: weekToPeriodIndex, bucketCount }),
          lastYear: aggregateWeekly({ weekly: weeklyLastYearSpend, bucketIndexByWeek: weekToPeriodIndex, bucketCount }),
        },
      };
    }

    if (kind === "quarter") {
      const bucketCount = 4;
      return {
        labels: quarterLabels,
        sales: {
          cyActual: aggregateWeekly({ weekly: splitSales.cyActual, bucketIndexByWeek: weekToQuarterIndex, bucketCount }),
          cyForecast: aggregateWeekly({ weekly: splitSales.cyForecast, bucketIndexByWeek: weekToQuarterIndex, bucketCount }),
          budget: aggregateWeekly({ weekly: weeklyBudgetSales, bucketIndexByWeek: weekToQuarterIndex, bucketCount }),
          lastYear: aggregateWeekly({ weekly: weeklyLastYearSales, bucketIndexByWeek: weekToQuarterIndex, bucketCount }),
        },
        volume: {
          cyActual: aggregateWeekly({ weekly: splitVolume.cyActual, bucketIndexByWeek: weekToQuarterIndex, bucketCount }),
          cyForecast: aggregateWeekly({ weekly: splitVolume.cyForecast, bucketIndexByWeek: weekToQuarterIndex, bucketCount }),
          budget: aggregateWeekly({ weekly: weeklyBudgetVolume, bucketIndexByWeek: weekToQuarterIndex, bucketCount }),
          lastYear: aggregateWeekly({ weekly: weeklyLastYearVolume, bucketIndexByWeek: weekToQuarterIndex, bucketCount }),
        },
        spend: {
          cyActual: aggregateWeekly({ weekly: splitSpend.cyActual, bucketIndexByWeek: weekToQuarterIndex, bucketCount }),
          cyForecast: aggregateWeekly({ weekly: splitSpend.cyForecast, bucketIndexByWeek: weekToQuarterIndex, bucketCount }),
          budget: aggregateWeekly({ weekly: weeklyBudgetSpend, bucketIndexByWeek: weekToQuarterIndex, bucketCount }),
          lastYear: aggregateWeekly({ weekly: weeklyLastYearSpend, bucketIndexByWeek: weekToQuarterIndex, bucketCount }),
        },
      };
    }

    // annual
    return {
      labels: annualLabels,
      sales: {
        cyActual: [sum(splitSales.cyActual)],
        cyForecast: [sum(splitSales.cyForecast)],
        budget: [sum(weeklyBudgetSales)],
        lastYear: [sum(weeklyLastYearSales)],
      },
      volume: {
        cyActual: [sum(splitVolume.cyActual)],
        cyForecast: [sum(splitVolume.cyForecast)],
        budget: [sum(weeklyBudgetVolume)],
        lastYear: [sum(weeklyLastYearVolume)],
      },
      spend: {
        cyActual: [sum(splitSpend.cyActual)],
        cyForecast: [sum(splitSpend.cyForecast)],
        budget: [sum(weeklyBudgetSpend)],
        lastYear: [sum(weeklyLastYearSpend)],
      },
    };
  };

  const annual = {
    sales: {
      cyTotal: sum(splitSales.cyActual) + sum(splitSales.cyForecast),
      budget: sum(weeklyBudgetSales),
      lastYear: sum(weeklyLastYearSales),
    },
    volume: {
      cyTotal: sum(splitVolume.cyActual) + sum(splitVolume.cyForecast),
      budget: sum(weeklyBudgetVolume),
      lastYear: sum(weeklyLastYearVolume),
    },
    spend: {
      cyTotal: sum(splitSpend.cyActual) + sum(splitSpend.cyForecast),
      budget: sum(weeklyBudgetSpend),
      lastYear: sum(weeklyLastYearSpend),
    },
  };

  const ytdCutoff = cutoffIndex == null ? -1 : cutoffIndex;
  const ytd = {
    volume: {
      cyActual: sum(splitVolume.cyActual),
      lastYearYtd: ytdCutoff < 0 ? 0 : sum(weeklyLastYearVolume.slice(0, ytdCutoff + 1)),
    },
  };

  return {
    cutoff: {
      weekIndex: cutoffIndex,
      weekEndDate: cutoffWeekEndDate,
      nextWeekEndDate,
    },
    weekly: {
      labels: weekLabels,
      sales: { cyActual: splitSales.cyActual, cyForecast: splitSales.cyForecast, lastYear: weeklyLastYearSales, labels: weekLabels },
      volume: { cyActual: splitVolume.cyActual, cyForecast: splitVolume.cyForecast, lastYear: weeklyLastYearVolume, labels: weekLabels },
      spend: { cyActual: splitSpend.cyActual, cyForecast: splitSpend.cyForecast, lastYear: weeklyLastYearSpend, labels: weekLabels },
    },
    view: {
      period: buildView("period"),
      quarter: buildView("quarter"),
      annual: buildView("annual"),
    },
    annual,
    ytd,
  };
}
