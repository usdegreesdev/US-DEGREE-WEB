// Minimal shapes for the backend JSON the university page consumes. Every field
// is optional because the endpoints may omit data; we only declare what is read.
import { EarningsFillMethod } from "@/types/earningsMethod";

export type ApiNum = number | string | null;

// Per-horizon cohort-resolved earnings — year_1/year_5/year_10 are each
// independently resolved against whichever grad_cohort has the best
// available data for that specific horizon, so they can legitimately carry
// different `cohort` years from one another. Supersedes the flat
// `earnings.year_1/5/10` + `earnings.year_N_method` fields below, which
// reflect a single (implicitly first-returned) grad_cohort row and don't
// expose which cohort backed them.
export interface ApiResolvedEarningsMetric {
  value?: ApiNum;
  method?: EarningsFillMethod | null;
  cohort?: string | null;
}

export interface ApiEarningsResolved {
  year_1?: ApiResolvedEarningsMetric;
  year_5?: ApiResolvedEarningsMetric;
  year_10?: ApiResolvedEarningsMetric;
}

export interface ApiOverview {
  program?: {
    cip_code?: string;
    credential_title?: string;
    credential_level?: number | null;
  };
  school?: {
    school_name?: string;
    school_description?: string;
    program_count?: number | null;
    accreditor?: string | null;
  };
  students?: {
    size?: number | null;
    student_faculty_ratio?: ApiNum;
    retention_rate?: number | null;
    fafsa_applications?: number | null;
  };
  admissions?: {
    admission_rate?: number | null;
    sat_avg_overall?: ApiNum;
    publish_publicly?: boolean | null;
    school_min_range?: ApiNum;
    school_max_range?: ApiNum;
    sat_p25_reading?: ApiNum;
    sat_p75_reading?: ApiNum;
    sat_p25_math?: ApiNum;
    sat_p75_math?: ApiNum;
    sat_rw_min?: number | null;
    sat_rw_max?: number | null;
    sat_math_min?: number | null;
    sat_math_max?: number | null;
    // Testing-requirements disclosure (publishable rows only; the backend
    // suppresses Tier 3). Absent/null category ⇒ show the numeric SAT range.
    satDisclosureCategory?: string | null;
    badgeLabel?: string | null;
    badgeColor?: string | null;
    supportingCopy?: string | null;
    disclaimerTier?: number | null;
    disclaimerText?: string | null;
    showAdmissionRateRequired?: boolean | null;
  };
  completion?: { completion_rate?: number | null };
  earnings?: {
    year_1?: ApiNum;
    year_5?: ApiNum;
    year_10?: ApiNum;
    year_1_method?: EarningsFillMethod | null;
    year_5_method?: EarningsFillMethod | null;
    year_10_method?: EarningsFillMethod | null;
    growth_rate?: ApiNum;
    avg_salary?: ApiNum;
  };
  roi?: { roi_20yr?: ApiNum };
  school_description?: string;
}

export interface ApiOutcomes {
  // Legacy flat shape — a single implicitly-chosen grad_cohort row. Kept only
  // as a fallback for `earnings_resolved` below; new code should read
  // `earnings_resolved`, not this.
  earnings?: {
    year_1?: ApiNum;
    year_5?: ApiNum;
    year_10?: ApiNum;
    year_1_method?: EarningsFillMethod | null;
    year_5_method?: EarningsFillMethod | null;
    year_10_method?: EarningsFillMethod | null;
    growth_rate?: ApiNum;
    avg_salary?: ApiNum;
  };
  earnings_resolved?: ApiEarningsResolved;
  roi?: { roi_20yr?: ApiNum };
  completion?: { emp_factor?: ApiNum };
  debt_income_ratio?: { debt_income_ratio?: ApiNum };
}

export interface ApiCollege {
  school_name?: string;
  city?: string;
  state?: string;
  school_type?: string;
  school_url?: string | null;
  accreditor?: string | null;
}

/** Shape of GET /programs/:id, as consumed by ProgramsAcademicsTab. */
export interface ApiPrograms {
  popular_fields?: { field_name: string; percentage: number }[];
  comprehensive_degree_levels?: {
    level: string;
    total_programs: number;
    top_titles: string[];
  }[];
}

export interface ApiUni {
  unitid?: string | number;
  accreditor?: string | null;
}

export interface UniversitySearchParams {
  cip?: string;
  name?: string;
  city?: string;
  state?: string;
  degree?: string;
  // The real credential title (e.g. "Doctoral Degree"), when the caller
  // has one — used to disambiguate which credential level of a shared
  // cip_code to fetch. `degree` above is sometimes a program title instead
  // (see ResultCard.tsx), so it can't always be trusted for this.
  credentialTitle?: string;
  type?: string;
  admissionRate?: string;
  tuition?: string;
  avgSalary?: string;
  roi?: string;
}
