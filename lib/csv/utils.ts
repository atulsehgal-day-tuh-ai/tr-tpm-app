export function normalizeHeader(h: string): string {
  // Trim + collapse weird whitespace (including non-breaking) into a single space.
  return (h || "")
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMoneyLike(v: string | undefined): number | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "-" || s === "—") return null;
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseNumberLike(v: string | undefined): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "-" || s === "—") return null;
  const cleaned = s.replace(/[,]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseMmDdYy(s: string): string | null {
  // Input like "01-07-24" => 2024-01-07
  const m = String(s || "").trim().match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const yy = Number(m[3]);
  const year = yy >= 70 ? 1900 + yy : 2000 + yy;
  const iso = `${year.toString().padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  return iso;
}

export function parseMdy(s: string): string | null {
  // Accept common inputs like 1/1/2025, 10/17/2025
  const m = String(s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const year = Number(m[3]);
  const iso = `${year.toString().padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  return iso;
}

