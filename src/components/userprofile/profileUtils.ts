/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { StudentProfile } from "../../types/profile";

export interface ProfileAuthUser {
  displayName: string | null;
  email: string | null;
  createdAt?: string | null;
  lastLogin?: string | null;
}

/**
 * Formats an ISO date string into a friendly localized date string.
 * Example: "2026-08-13T10:00:00Z" -> "August 13, 2026"
 */
export function formatDbDate(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Returns value if defined and non-null, otherwise returns fallback.
 */
export function pick<T>(value: unknown, fallback: T): T {
  return value === undefined || value === null ? fallback : (value as T);
}

/**
 * Legacy support for SAT scores stored as split reading/math columns.
 */
export function legacySatTotal(data: Record<string, unknown>): number | null {
  const rw = Number(data.sat_reading_writing ?? data.satReadingWriting);
  const math = Number(data.sat_math ?? data.satMath);
  if (Number.isFinite(rw) && Number.isFinite(math)) return rw + math;
  return null;
}

/**
 * Creates an empty StudentProfile object seeded with the signed-in user's info.
 */
export function emptyProfile(
  authUser?: ProfileAuthUser | null,
): StudentProfile {
  return {
    fullName: authUser?.displayName ?? "",
    email: authUser?.email ?? "",
    phone: "",
    address: "",
    createdDate: formatDbDate(authUser?.createdAt, ""),
    lastLogin: formatDbDate(authUser?.lastLogin, ""),
    householdIncomeRange: "",
    highSchoolName: "",
    graduationYear: null,
    gpa: null,
    satScore: null,
    actScore: null,
    preferredStates: [],
    preferredPrograms: [],
    preferredDegreeLevel: "",
    preferredCollegeType: "",
  };
}

/**
 * Checks if the user has entered any academic or preference details.
 */
export function isProfileEmpty(p: StudentProfile): boolean {
  return (
    !p.phone &&
    !p.address &&
    !p.highSchoolName &&
    p.graduationYear == null &&
    p.gpa == null &&
    p.satScore == null &&
    p.actScore == null &&
    p.preferredStates.length === 0 &&
    p.preferredPrograms.length === 0 &&
    !p.preferredDegreeLevel &&
    !p.preferredCollegeType
  );
}

/**
 * Merges backend profile API response data into existing StudentProfile state.
 */
export function mergeProfile(
  prev: StudentProfile,
  data: Record<string, unknown>,
): StudentProfile {
  return {
    ...prev,
    fullName: pick(
      data.display_name ?? data.full_name ?? data.fullName,
      prev.fullName,
    ),
    email: pick(data.email, prev.email),
    phone: pick(data.phone, prev.phone),
    address: pick(data.address, prev.address),
    createdDate: data.created_at
      ? formatDbDate(data.created_at as string, prev.createdDate)
      : prev.createdDate,
    lastLogin: data.last_login
      ? formatDbDate(data.last_login as string, prev.lastLogin)
      : prev.lastLogin,
    highSchoolName: pick(
      data.high_school_name ?? data.highSchoolName,
      prev.highSchoolName,
    ),
    graduationYear: pick(
      data.graduation_year ?? data.graduationYear,
      prev.graduationYear,
    ),
    gpa: pick(data.gpa, prev.gpa),
    satScore:
      pick(data.sat_score ?? data.satScore, null) ??
      legacySatTotal(data) ??
      prev.satScore,
    actScore: pick(data.act_score ?? data.actScore, prev.actScore),
    preferredStates: pick(
      data.preferred_states ?? data.preferredStates,
      prev.preferredStates,
    ),
    preferredPrograms: pick(
      data.preferred_programs ?? data.preferredPrograms,
      prev.preferredPrograms,
    ),
    preferredDegreeLevel: pick(
      data.preferred_degree_level ?? data.preferredDegreeLevel,
      prev.preferredDegreeLevel,
    ),
    preferredCollegeType: pick(
      data.preferred_college_type ?? data.preferredCollegeType,
      prev.preferredCollegeType,
    ),
    householdIncomeRange: pick(
      data.household_income_range ?? data.householdIncomeRange,
      prev.householdIncomeRange,
    ),
  };
}

/**
 * Compares two string arrays without considering item order.
 */
export function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

/**
 * Prepares camelCase payload containing only fields that changed for PATCH /profile.
 */
export function toProfilePatch(
  prev: StudentProfile,
  values: Omit<StudentProfile, "createdDate" | "lastLogin">,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  const setIfChanged = (key: string, next: unknown, before: unknown) => {
    if (next !== before) patch[key] = next;
  };

  setIfChanged("fullName", values.fullName, prev.fullName);
  setIfChanged("phone", values.phone, prev.phone);
  setIfChanged("address", values.address, prev.address);
  setIfChanged("highSchoolName", values.highSchoolName, prev.highSchoolName);
  setIfChanged("graduationYear", values.graduationYear, prev.graduationYear);
  setIfChanged("gpa", values.gpa, prev.gpa);
  setIfChanged("satScore", values.satScore, prev.satScore);
  setIfChanged("actScore", values.actScore, prev.actScore);
  setIfChanged(
    "preferredDegreeLevel",
    values.preferredDegreeLevel,
    prev.preferredDegreeLevel,
  );
  setIfChanged(
    "preferredCollegeType",
    values.preferredCollegeType ?? "",
    prev.preferredCollegeType,
  );

  // Income is optional and clearing it isn't supported by PATCH /profile, so
  // only a newly chosen slab is sent.
  if (
    values.householdIncomeRange &&
    values.householdIncomeRange !== prev.householdIncomeRange
  ) {
    patch.householdIncomeRange = values.householdIncomeRange;
  }

  const nextStates = (values.preferredStates ?? []).map((s) => s.toUpperCase());
  if (!sameStringSet(nextStates, prev.preferredStates)) {
    patch.preferredStates = nextStates;
  }
  const nextPrograms = values.preferredPrograms ?? [];
  if (!sameStringSet(nextPrograms, prev.preferredPrograms)) {
    patch.preferredPrograms = nextPrograms;
  }

  return patch;
}

/**
 * Returns beginner-friendly error messages for Firebase Authentication errors.
 */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string } | null)?.code ?? "";
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "Your current password is incorrect.";
  }
  if (code === "auth/weak-password") {
    return "The new password is too weak (use at least 6 characters).";
  }
  if (code === "auth/email-already-in-use") {
    return "That email address is already in use by another account.";
  }
  if (code === "auth/requires-recent-login") {
    return "For security, please sign out and back in, then try again.";
  }
  return fallback;
}
