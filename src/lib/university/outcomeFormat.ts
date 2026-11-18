export const NOT_PUBLISHED = "Not published";

/**
 * students.retention_rate is a 0–1 FRACTION (unlike the graduation rate, which
 * is already a 0–100 percent). Returns a 0–100 percent; null stays null and a
 * real 0 stays 0. No defaults.
 */
export function retentionToPercent(
  val: number | string | null | undefined,
): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num * 100 : null;
}

/** Formats a 0–100 percent. null → "Not published"; a real 0 → "0%". */
export function formatPercentOrNotPublished(
  pct: number | null | undefined,
  digits = 0,
): string {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) {
    return NOT_PUBLISHED;
  }
  return `${pct.toFixed(digits)}%`;
}
