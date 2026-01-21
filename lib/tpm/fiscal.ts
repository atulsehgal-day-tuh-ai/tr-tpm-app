export type FiscalPeriodKey = `P${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;

export type FiscalPeriod = {
  key: FiscalPeriodKey;
  monthShort:
    | "Jan"
    | "Feb"
    | "Mar"
    | "Apr"
    | "May"
    | "Jun"
    | "Jul"
    | "Aug"
    | "Sep"
    | "Oct"
    | "Nov"
    | "Dec";
  weeks: number; // 4/5 (and 6 in 53-week years for P12)
  isoWeekStart: number;
  isoWeekEnd: number;
  startDate: Date;
  endDate: Date;
};

/**
 * 4-4-5 fiscal calendar pattern per quarter:
 * Q1: 4,4,5; Q2: 4,4,5; Q3: 4,4,5; Q4: 4,4,5
 *
 * For this TPM grid we label periods as P1..P12 and map them to calendar months for readability.
 */
const basePeriodMeta: Array<{ key: FiscalPeriodKey; monthShort: FiscalPeriod["monthShort"]; weeks: 4 | 5 }> = [
  { key: "P1", monthShort: "Jan", weeks: 4 },
  { key: "P2", monthShort: "Feb", weeks: 4 },
  { key: "P3", monthShort: "Mar", weeks: 5 },
  { key: "P4", monthShort: "Apr", weeks: 4 },
  { key: "P5", monthShort: "May", weeks: 4 },
  { key: "P6", monthShort: "Jun", weeks: 5 },
  { key: "P7", monthShort: "Jul", weeks: 4 },
  { key: "P8", monthShort: "Aug", weeks: 4 },
  { key: "P9", monthShort: "Sep", weeks: 5 },
  { key: "P10", monthShort: "Oct", weeks: 4 },
  { key: "P11", monthShort: "Nov", weeks: 4 },
  { key: "P12", monthShort: "Dec", weeks: 5 },
];

function isoWeekMonday(year: number, week: number): Date {
  // ISO week date algorithm: week 1 is the week with Jan 4th in it.
  // Returns Monday of the requested ISO week.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // 1..7 (Mon..Sun)
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));

  const d = new Date(week1Monday);
  d.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return d;
}

function isoWeeksInYear(year: number): number {
  // ISO weeks in a year: week number of Dec 28th (always in last ISO week)
  const dec28 = new Date(Date.UTC(year, 11, 28));
  // Compute ISO week number of dec28
  const day = dec28.getUTCDay() || 7;
  const thursday = new Date(dec28);
  thursday.setUTCDate(dec28.getUTCDate() + (4 - day));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const diffDays = Math.floor((thursday.getTime() - yearStart.getTime()) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

export function getFiscalPeriodsForYear(year: number): FiscalPeriod[] {
  const totalIsoWeeks = isoWeeksInYear(year); // 52 or 53

  // 4-4-5 totals to 52 weeks. If ISO year has 53 weeks, roll the extra week into P12.
  const extra = totalIsoWeeks > 52 ? totalIsoWeeks - 52 : 0;

  let cursorWeek = 1;
  return basePeriodMeta.map((p, idx) => {
    const isLast = idx === basePeriodMeta.length - 1;
    const weeks = p.weeks + (isLast ? extra : 0);
    const isoWeekStart = cursorWeek;
    const isoWeekEnd = cursorWeek + weeks - 1;
    cursorWeek = isoWeekEnd + 1;

    const startDate = isoWeekMonday(year, isoWeekStart);
    const endDate = new Date(isoWeekMonday(year, isoWeekEnd));
    endDate.setUTCDate(endDate.getUTCDate() + 6); // Sunday

    return {
      key: p.key,
      monthShort: p.monthShort,
      weeks,
      isoWeekStart,
      isoWeekEnd,
      startDate,
      endDate,
    };
  });
}

export function formatDateRange(d1: Date, d2: Date) {
  const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", year: "numeric" });
  return `${fmt.format(d1)} – ${fmt.format(d2)}`;
}

export function formatIsoWeekRange(start: number, end: number) {
  return start === end ? `ISO week ${start}` : `ISO weeks ${start}–${end}`;
}

export function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

export function round0(n: number) {
  return Math.round(n);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatNumber(n: number, opts?: { style?: "number" | "currency" | "percent" }) {
  const style = opts?.style ?? "number";
  if (style === "currency") {
    return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  if (style === "percent") {
    return (n * 100).toFixed(1) + "%";
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function getCurrentPeriodIndexForYear(year: number, now = new Date()): number {
  // Simple mapping for this prototype: treat each fiscal period as the corresponding calendar month.
  // 0-based index: Jan->0 ... Dec->11
  if (year < now.getFullYear()) return 11;
  if (year > now.getFullYear()) return -1;
  return now.getMonth();
}

