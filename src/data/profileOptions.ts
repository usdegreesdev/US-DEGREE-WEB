/**
 * Static UI option lists for profile forms.
 *
 * NOTE: states and degree levels are NOT here — those come from the live
 * backend (GET /states, GET /degree-levels) via src/lib/referenceData.ts.
 * These two lists have no backend endpoint in the current contract, so they
 * remain frontend constants (flagged for a future reference endpoint). They are
 * option lists, not fabricated user/profile data.
 */

export const PROGRAM_OPTIONS = [
  "Computer Science",
  "Business Administration",
  "Data Science",
  "Mechanical Engineering",
  "Psychology",
  "Electrical Engineering",
  "Biotechnology",
  "Economics",
];

export const DEACTIVATION_REASONS = [
  { value: "1", label: "I found another college platform" },
  { value: "2", label: "I no longer plan to attend college" },
  { value: "3", label: "Privacy concerns" },
  { value: "4", label: "Other" },
];

/** Approximate annual household income slabs: stable id (stored) -> label. */
export const HOUSEHOLD_INCOME_OPTIONS = [
  { value: "0_30000", label: "$0 – $30,000" },
  { value: "30001_48000", label: "$30,001 – $48,000" },
  { value: "48001_75000", label: "$48,001 – $75,000" },
  { value: "75001_110000", label: "$75,001 – $110,000" },
  { value: "110001_plus", label: "$110,001+" },
];
