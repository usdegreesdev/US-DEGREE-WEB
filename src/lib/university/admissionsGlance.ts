/**
 * View-model for the Admissions tab ("Admissions at a glance" + "SAT score
 * ranges"). Postgres numerics arrive as strings; null means missing, never 0.
 */

type Loose = number | string | null | undefined;

export interface AdmissionsGlanceInput {
  admission_rate?: Loose;
  sat_avg_overall?: Loose;
  satDisclosureCategory?: string | null;
  publish_publicly?: boolean | null;
  school_min_range?: Loose;
  school_max_range?: Loose;
  sat_p25_reading?: Loose;
  sat_p75_reading?: Loose;
  sat_p25_math?: Loose;
  sat_p75_math?: Loose;
}

export interface ScoreRange {
  low: number;
  high: number;
}

export interface AdmissionsGlance {
  /** false only when publish_publicly is explicitly false. */
  visible: boolean;
  /** 0–100, null when missing. */
  acceptancePct: number | null;
  avgSat: number | null;
  /** null hides the tile (closed institution). */
  policyLabel: string | null;
  showPolicyTile: boolean;
  showRanges: boolean;
  overall: ScoreRange | null;
  readingWriting: ScoreRange | null;
  math: ScoreRange | null;
}

export const SAT_POLICY_LABELS: Record<string, string> = {
  A_OPEN_ADMISSION: "Open admission",
  B_NOT_USED: "Not used in admission",
  C_TEST_OPTIONAL: "Test-optional",
  E_TEST_REQUIRED_NO_RANGE: "Required",
};

export const SAT_POLICY_CLOSED = "F_INSTITUTION_CLOSED";

export const toNum = (value: Loose): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toRange = (low: Loose, high: Loose): ScoreRange | null => {
  const l = toNum(low);
  const h = toNum(high);
  if (l === null || h === null || l <= 0 || h <= 0 || h < l) return null;
  return { low: l, high: h };
};

export function buildAdmissionsGlance(
  raw: AdmissionsGlanceInput | null | undefined,
): AdmissionsGlance {
  const category = raw?.satDisclosureCategory ?? null;
  const closed = category === SAT_POLICY_CLOSED;
  const rate = toNum(raw?.admission_rate);
  const avg = toNum(raw?.sat_avg_overall);

  return {
    visible: raw?.publish_publicly !== false,
    acceptancePct: rate === null ? null : rate * 100,
    avgSat: avg === null || avg <= 0 ? null : avg,
    policyLabel: category ? (SAT_POLICY_LABELS[category] ?? null) : null,
    showPolicyTile: !closed,
    showRanges: !closed,
    overall: toRange(raw?.school_min_range, raw?.school_max_range),
    readingWriting: toRange(raw?.sat_p25_reading, raw?.sat_p75_reading),
    math: toRange(raw?.sat_p25_math, raw?.sat_p75_math),
  };
}

/** Bar geometry, clamped so the fill never overflows its track. */
export function rangeBarGeometry(
  range: ScoreRange,
  scaleMin: number,
  scaleMax: number,
) {
  const span = scaleMax - scaleMin;
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  const left = clamp(((range.low - scaleMin) / span) * 100);
  const width = Math.min(
    100 - left,
    clamp(((range.high - range.low) / span) * 100),
  );
  return { left, width };
}
