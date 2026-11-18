import { NOT_PUBLISHED } from "@/lib/notPublished";
import { toPercent } from "@/lib/fieldScale";

export { NOT_PUBLISHED };

/**
 * students.retention_rate as a 0–100 percent (the column is a 0–1 fraction;
 * the scale is declared once in lib/fieldScale). null stays null, a real 0
 * stays 0.
 */
export function retentionToPercent(
  val: number | string | null | undefined,
): number | null {
  return toPercent("students.retention_rate", val);
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
