import { fetchProfile } from "@/lib/auth/api";
import type { College } from "@/types/university/ComparisonTable";
import { emptyProfile, mergeProfile } from "@/components/userprofile/ProfileDashboard";
import { fetchStates, type StateOption } from "@/lib/referenceData";
import {
  checkAlignment,
  normalizeField,
  profilePrefsFromApi,
} from "@/lib/academicAlignment";
import type { AlignmentLabels } from "../AcademicAlignmentModal";
import { DEGREE_LABEL } from "./reportConfig";

export interface AlignmentPrompt {
  saved: AlignmentLabels;
  current: AlignmentLabels;
}

/**
 * Academic preference alignment: compares the saved profile preferences with
 * the actual program + state of every selected college (backend-normalized
 * fields only). Returns the modal data on a difference, or null when
 * aligned / no saved prefs / data unavailable / any failure (fail open).
 */
export async function buildAlignmentPrompt(
  user: Parameters<typeof emptyProfile>[0],
  colleges: College[],
): Promise<AlignmentPrompt | null> {
  try {
    const data = await fetchProfile<Record<string, unknown>>();
    const result = checkAlignment(
      profilePrefsFromApi(data),
      colleges.map((c) => ({
        degreeLevel: c.degreeLevel,
        cipCode: c.programCipCode,
        stateCode: c.stateCode,
      })),
    );
    if (result.aligned) return null;

    // Display names only — never used for matching.
    let states: StateOption[] = [];
    try {
      states = await fetchStates();
    } catch {
      // Fall back to the 2-letter code.
    }
    const stateName = (code: string) =>
      states.find((s) => s.code.toUpperCase() === code)?.name ?? code;
    const fieldName = (family: string) =>
      colleges.find(
        (c) => normalizeField(c.programCipCode) === family && c.programName,
      )?.programName ?? family;
    const profile = mergeProfile(emptyProfile(user), data);

    return {
      saved: {
        degrees: result.saved.degrees.map((d) => DEGREE_LABEL[d]),
        fields: profile.preferredPrograms,
        states: result.saved.states.map(stateName),
      },
      current: {
        degrees: result.current.degrees.map((d) => DEGREE_LABEL[d]),
        fields: result.current.fields.map(fieldName),
        states: result.current.states.map(stateName),
      },
    };
  } catch (err) {
    console.error("Academic alignment check failed:", err);
    return null;
  }
}
