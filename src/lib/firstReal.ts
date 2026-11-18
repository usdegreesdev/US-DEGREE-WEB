/**
 * The first value that is a real number (finite, not null/undefined) —
 * including a real 0. Replaces `a || b || null` chains on numeric data,
 * which silently skip a real 0 and treat it as missing.
 */
export function firstReal(
  ...vals: Array<number | string | null | undefined>
): number | null {
  for (const v of vals) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
