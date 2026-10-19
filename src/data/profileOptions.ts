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
