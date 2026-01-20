export type FiscalPeriod = {
  key: `P${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;
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
  weeks: 4 | 5;
};

/**
 * 4-4-5 fiscal calendar pattern per quarter:
 * Q1: 4,4,5; Q2: 4,4,5; Q3: 4,4,5; Q4: 4,4,5
 *
 * For this TPM grid we label periods as P1..P12 and map them to calendar months for readability.
 */
export const fiscalPeriods: FiscalPeriod[] = [
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

