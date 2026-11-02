/**
 * Types backing the Profile Dashboard's mock match/saved/compare data.
 * These are local to the profile feature; live college data on /compare and
 * /university uses the API-driven `College` type instead.
 */

export interface University {
  id: string;
  /** IPEDS unit id used to look the college up on the live /compare page. */
  unitid: string;
  name: string;
  city: string;
  state: string;
  type: "Public" | "Private";
  ranking: number;
  acceptanceRate: number;
  annualCost: number;
  rating: number;
  description: string;
  logoColor: string;
  image: string;
}

export interface Program {
  id: string;
  universityId: string;
  name: string;
  fieldOfStudy: string;
  state: string;
  degreeLevel: string;
}

/**
 * The student profile as rendered by the dashboard. Sourced solely from
 * GET /profile — there is no mock/seed data. Numeric academic fields are
 * nullable so a field the backend returns empty renders blank (never a
 * fabricated sample value).
 */
export interface StudentProfile {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  createdDate: string;
  lastLogin: string;

  /** Stable income slab id (see HOUSEHOLD_INCOME_OPTIONS); "" when unset. */
  householdIncomeRange: string;

  highSchoolName: string;
  graduationYear: number | null;
  gpa: number | null;

  /** Single total SAT score (400–1600). Replaces the old split R/W + Math. */
  satScore: number | null;
  actScore?: number | null;

  preferredStates: string[]; // 2-letter codes e.g. ['CA', 'NY']
  preferredPrograms: string[];
  preferredDegreeLevel: string;
  preferredCollegeType: string; // "" (no preference) | "Public" | "Private"
}
