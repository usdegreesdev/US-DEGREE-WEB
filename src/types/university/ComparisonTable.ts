import { EarningsFillMethod } from "@/types/earningsMethod";
import { ApiEarningsResolved } from "@/types/university/apiResponses";

export interface College {
  schoolUrl: string | undefined;
  /** Unique per row in the comparison matrix — may be `unitid` alone, or
   * `unitid~cipCode~credentialLevel` when the same college is compared under
   * more than one program. Use `unitid` (below) for any backend lookup. */
  id: string;
  /** The actual college identifier, for API calls — never unique alone
   * across `comparedColleges`, since the same college can appear more than
   * once under different programs. */
  unitid: string;
  name: string;
  shortName: string;
  logo: string;
  state: string;
  location: string;
  isPrivate: boolean;
  tuitionInState: number | null;
  tuitionOutOfState: number | null;
  acceptanceRate: number | null; // 0.0 to 1.0
  satMin: number | null;
  satMax: number | null;
  graduationRate: number | null; // 0.0 to 1.0
  medianSalary: number | null;
  studentPopulation: number | null;
  image: string;
  cipCode?: string;
  programName?: string;
  credentialTitle?: string;
}

// Resolved, display-ready detail shown in the CollegeDetailsModal and cached on the compare page.
export interface CollegeDetail {
  name: string;
  location: string;
  type: string;
  logo: string | null;
  totalStudents: number | null;
  facultyRatio: string;
  retentionRate: string;
  programs: number | null;
  fafsaApplications: number | null;
  completionRate: string;
  tuitionInState: number | null;
  tuitionOutOfState: number | null;
  satReadingWriting: string | null;
  satMath: string | null;
  satAverage: string | null;
  acceptanceRate: string;
  graduates3yr: string;
  salaryYear1: number | null;
  salaryYear5: number | null;
  salaryYear10: number | null;
  salaryYear1Method: EarningsFillMethod | null;
  salaryYear5Method: EarningsFillMethod | null;
  salaryYear10Method: EarningsFillMethod | null;
  salaryYear1Cohort: string | null;
  salaryYear5Cohort: string | null;
  salaryYear10Cohort: string | null;
  menStudentsPct: number | null;
  womenStudentsPct: number | null;
  menFacultyPct: number | null;
  womenFacultyPct: number | null;
}

// ---- Raw API response shapes consumed by the CollegeDetailsModal ----
export type ApiNumber = number | string | null | undefined;

export interface OverviewResponse {
  program?: { cip_code?: string };
  school_name?: string;
  school_url?: string;
  school?: {
    school_name?: string;
    name?: string;
    city?: string;
    state?: string;
    control?: string;
    school_url?: string;
    program_count?: number | null;
  };
  students?: {
    size?: number | null;
    student_faculty_ratio?: ApiNumber;
    retention_rate?: number | null;
    fafsa_applications?: number | null;
  };
  completion?: { completion_rate?: number | null };
  admissions?: {
    sat_rw_min?: number | null;
    sat_rw_max?: number | null;
    sat_math_min?: number | null;
    sat_math_max?: number | null;
    sat_avg_overall?: ApiNumber;
    admission_rate?: number | null;
  };
  // Legacy flat shape — a single implicitly-chosen grad_cohort row. Kept only
  // as a fallback for `earnings_resolved`; new code should read that instead.
  earnings?: {
    year_1?: ApiNumber;
    year_5?: ApiNumber;
    year_10?: ApiNumber;
    year_1_method?: EarningsFillMethod | null;
    year_5_method?: EarningsFillMethod | null;
    year_10_method?: EarningsFillMethod | null;
  };
  earnings_resolved?: ApiEarningsResolved;
}

export interface TuitionResponse {
  tuition?: { tuition_in_state?: ApiNumber; tuition_out_state?: ApiNumber };
}

export interface CampusResponse {
  campus?: { student_faculty_ratio?: ApiNumber };
  repayment?: { all_borrowers_3yr?: ApiNumber };
  students?: {
    demographics?: { men?: ApiNumber; women?: ApiNumber };
    faculty?: { men?: ApiNumber; women?: ApiNumber };
  };
}

// `/college-summary/{unitid}` — merges the old `/tuition/{unitid}` and
// `/campus/{unitid}` responses into one payload (same field paths as both).
export type CollegeSummaryResponse = TuitionResponse & CampusResponse;

export interface CollegeResponse {
  school_name?: string;
  name?: string;
  city?: string;
  state?: string;
  control?: string;
  school_url?: string;
}

export interface OutcomesResponse {
  earnings?: {
    year_1?: ApiNumber;
    year_5?: ApiNumber;
    year_10?: ApiNumber;
    year_1_method?: EarningsFillMethod | null;
    year_5_method?: EarningsFillMethod | null;
    year_10_method?: EarningsFillMethod | null;
  };
  earnings_resolved?: ApiEarningsResolved;
}
