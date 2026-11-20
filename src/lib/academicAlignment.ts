/**
 * Academic preference alignment: does the current Compare selection match the
 * student's saved profile preferences (degree level, field of study, state)?
 *
 * Pure — no React, no I/O. Consumes ONLY the backend's normalized fields:
 *   profile: preferredDegreeLevels / preferredFieldCipFamilies / preferredStateCodes
 *   compare item: degreeLevel / cipCode / stateCode
 * Comparison runs on normalized codes (degree bucket, 2-digit CIP family,
 * 2-letter state) — never on display text.
 */

export type DegreeCode =
  | "certificate"
  | "associate"
  | "bachelor"
  | "master"
  | "doctorate";

export type AlignmentField = "degree" | "field" | "state";

/** Same bucket mapping as the backend (utils/preferenceAlignment.ts):
 * 1,4,8 -> certificate; 2 -> associate; 3 -> bachelor; 5 -> master;
 * 6,7 -> doctorate. */
const CREDENTIAL_LEVEL_TO_DEGREE: Record<number, DegreeCode> = {
  1: "certificate",
  2: "associate",
  3: "bachelor",
  4: "certificate",
  5: "master",
  6: "doctorate",
  7: "doctorate",
  8: "certificate",
};

const TEXT_TO_DEGREE: Record<string, DegreeCode> = {
  "undergraduate certificate or diploma": "certificate",
  "associate's degree": "associate",
  "bachelor's degree": "bachelor",
  "post-baccalaureate certificate": "certificate",
  "master's degree": "master",
  "doctoral degree": "doctorate",
  "first professional degree": "doctorate",
  "graduate/professional certificate": "certificate",
  certificate: "certificate",
  associate: "associate",
  bachelor: "bachelor",
  master: "master",
  doctorate: "doctorate",
};

/** Bucket name (what the backend sends), IPEDS level code, or canonical
 * title. Unknown -> null (skipped). */
export function normalizeDegree(
  value: number | string | null | undefined,
): DegreeCode | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return CREDENTIAL_LEVEL_TO_DEGREE[value] ?? null;
  const s = value.trim().toLowerCase().replace(/[‘’]/g, "'");
  if (!s) return null;
  if (/^\d+$/.test(s)) return CREDENTIAL_LEVEL_TO_DEGREE[Number(s)] ?? null;
  return TEXT_TO_DEGREE[s] ?? null;
}

/** CIP code -> 2-digit family. Handles dotted ("11.07", "1.0701"), 4- and
 * 6-digit undotted ("1107", "110701"), and bare families. */
export function normalizeField(
  cipCode: string | number | null | undefined,
): string | null {
  if (cipCode === null || cipCode === undefined) return null;
  const s = String(cipCode).trim();
  if (!s || s === "default") return null;
  if (s.includes(".")) {
    const head = s.split(".")[0];
    return /^\d{1,2}$/.test(head) ? head.padStart(2, "0") : null;
  }
  if (!/^\d+$/.test(s)) return null;
  if (s.length <= 2) return s.padStart(2, "0");
  if (s.length === 4 || s.length === 6) return s.slice(0, 2);
  return null;
}

/** 2-letter state code -> upper-cased; anything else -> null (skipped). */
export function normalizeState(value: string | null | undefined): string | null {
  const s = value?.trim();
  return s && /^[A-Za-z]{2}$/.test(s) ? s.toUpperCase() : null;
}

/** Saved preferences as the backend returns them. Absent/empty = not set. */
export interface ProfilePrefs {
  preferredDegreeLevels?: readonly string[] | null;
  preferredFieldCipFamilies?: readonly string[] | null;
  preferredStateCodes?: readonly string[] | null;
}

/** One selected college's actual program + location (backend fields).
 * null/absent = unknown -> skipped for that college. */
export interface CompareItem {
  degreeLevel?: string | number | null;
  cipCode?: string | null;
  stateCode?: string | null;
}

/** Reads the backend preference fields from a raw GET /profile payload
 * (camelCase or snake_case). Missing/invalid -> null (not configured). */
export function profilePrefsFromApi(raw: Record<string, unknown>): ProfilePrefs {
  const list = (v: unknown): string[] | null =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null;
  return {
    preferredDegreeLevels: list(
      raw.preferredDegreeLevels ?? raw.preferred_degree_levels,
    ),
    preferredFieldCipFamilies: list(
      raw.preferredFieldCipFamilies ?? raw.preferred_field_cip_families,
    ),
    preferredStateCodes: list(raw.preferredStateCodes ?? raw.preferred_state_codes),
  };
}

export interface AlignmentValues {
  degrees: DegreeCode[];
  fields: string[];
  states: string[];
}

export interface AlignmentResult {
  aligned: boolean;
  saved: AlignmentValues;
  /** Unique differing compare values (one per value, not per college). */
  current: AlignmentValues;
  differingFields: AlignmentField[];
}

const uniq = <T>(xs: readonly T[]): T[] => [...new Set(xs)];
const known = <T>(xs: readonly (T | null)[]): T[] =>
  uniq(xs.filter((x): x is T => x !== null));

export function checkAlignment(
  prefs: ProfilePrefs,
  items: readonly CompareItem[],
): AlignmentResult {
  const saved: AlignmentValues = {
    degrees: known((prefs.preferredDegreeLevels ?? []).map(normalizeDegree)),
    fields: known((prefs.preferredFieldCipFamilies ?? []).map(normalizeField)),
    states: known((prefs.preferredStateCodes ?? []).map(normalizeState)),
  };

  // Mismatch only if the saved set is non-empty AND the (known) value is not
  // in it. Unknown compare values never count.
  const differing = <T extends string>(
    savedSet: readonly T[],
    values: readonly (T | null)[],
  ): T[] =>
    savedSet.length === 0
      ? []
      : known(values).filter((v) => !savedSet.includes(v));

  const current: AlignmentValues = {
    degrees: differing(saved.degrees, items.map((i) => normalizeDegree(i.degreeLevel))),
    fields: differing(saved.fields, items.map((i) => normalizeField(i.cipCode))),
    states: differing(saved.states, items.map((i) => normalizeState(i.stateCode))),
  };

  const differingFields: AlignmentField[] = [];
  if (current.degrees.length) differingFields.push("degree");
  if (current.fields.length) differingFields.push("field");
  if (current.states.length) differingFields.push("state");

  return {
    aligned: differingFields.length === 0,
    saved,
    current,
    differingFields,
  };
}
