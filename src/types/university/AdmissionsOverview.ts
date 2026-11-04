import { EarningsFillMethod } from "@/types/earningsMethod";

export interface AdmissionsOverviewProps {
  admissionRate: string;
  applicants: string;
  satReadingWriting: string;
  satMath: string;
  satAverage?: string;
  onViewAdmissions?: () => void;
  salaryYear1?: number | string | null;
  salaryYear10?: number | string | null;
  salaryYear1Method?: EarningsFillMethod | null;
  salaryYear10Method?: EarningsFillMethod | null;
  netRoi20Yr?: number | string | null;
  growthRate?: number | string | null;
}
