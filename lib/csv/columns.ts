import { normalizeHeader } from "@/lib/csv/utils";

export function findHeaderIndex(header: string[], aliases: string[]): number {
  const normalized = header.map((h) => normalizeHeader(h).toLowerCase());
  const aliasSet = aliases.map((a) => normalizeHeader(a).toLowerCase());
  for (const a of aliasSet) {
    const idx = normalized.findIndex((h) => h === a);
    if (idx >= 0) return idx;
  }
  return -1;
}

export function findHeaderIndexStartsWith(header: string[], prefixes: string[]): number {
  const normalized = header.map((h) => normalizeHeader(h).toLowerCase());
  const pref = prefixes.map((p) => normalizeHeader(p).toLowerCase());
  for (const p of pref) {
    const idx = normalized.findIndex((h) => h.startsWith(p));
    if (idx >= 0) return idx;
  }
  return -1;
}

