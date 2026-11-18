import { NOT_PUBLISHED } from "@/lib/notPublished";

/**
 * The ONE place a field's scale is declared. No call site decides whether a
 * value is a fraction or a percent, and nothing infers it from magnitude
 * (no `n < 2 ? n * 100 : n`): a fraction field is always ×100, a percent
 * field never is. Scales are from the Supabase column comments (the spec).
 *
 *   fraction   — 0–1, displayed ×100
 *   percent    — already 0–100 (may be negative where noted), displayed as is
 *   deprecated — never displayed; always renders "Not published"
 */
export const FIELD_SCALES = {
  // 0–1 fractions
  "students.retention_rate": "fraction",
  "students.faculty_men": "fraction",
  "students.faculty_women": "fraction",
  "admissions.admission_rate": "fraction",
  "aid.students_with_any_loan": "fraction",
  // percents
  "completion.grad_rate_150nt_pct": "percent",
  "repayment.graduates_3yr": "percent",
  "repayment.non_completers_3yr": "percent",
  "repayment.repayment_success": "percent",
  "aid.aid_percentage": "percent",
  /** May be negative (observed −98.55 to 683.57). */
  "earnings.growth_rate": "percent",
  // GET /campus serves students.demographics_* already converted to a 0–100
  // percent by the API's own registry (usdegrees-api src/utils/fieldScale.ts).
  "campus.demographics_men": "percent",
  "campus.demographics_women": "percent",
  // deprecated / empty — never display (see the column comments). The
  // retired employment factor is not listed: the website never reads it.
  "completion.completion_rate": "deprecated",
  "students.graduation_rate": "deprecated",
} as const;

export type ScaledField = keyof typeof FIELD_SCALES;
export type Scale = (typeof FIELD_SCALES)[ScaledField];

type Raw = number | string | null | undefined;

const finite = (v: Raw): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** The field's value as a 0–100 percent, or null. A real 0 stays 0. */
export function toPercent(field: ScaledField, value: Raw): number | null {
  const scale: Scale = FIELD_SCALES[field];
  if (scale === "deprecated") return null;
  const n = finite(value);
  if (n === null) return null;
  return scale === "fraction" ? n * 100 : n;
}

/** "1.5%", "-30%", "0%", or "Not published". */
export function formatPercent(
  field: ScaledField,
  value: Raw,
  digits = 0,
): string {
  const pct = toPercent(field, value);
  return pct === null ? NOT_PUBLISHED : `${pct.toFixed(digits)}%`;
}
