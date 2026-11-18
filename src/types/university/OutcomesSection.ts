import { EarningsFillMethod } from "@/types/earningsMethod";

export interface OutcomesSectionProps {
  salaryYear1?: number | string | null;
  salaryYear5?: number | string | null;
  salaryYear10?: number | string | null;
  salaryYear1Method?: EarningsFillMethod | null;
  salaryYear5Method?: EarningsFillMethod | null;
  salaryYear10Method?: EarningsFillMethod | null;
  // grad_cohort each figure was resolved from — independent per horizon, may
  // differ across year_1/5/10 for the same program.
  salaryYear1Cohort?: string | null;
  salaryYear5Cohort?: string | null;
  salaryYear10Cohort?: string | null;
  netRoi20Yr?: number | string | null;
  growthRate?: number | string | null;
  // First-year retention, already a 0–100 percent (null = not published).
  retentionPct?: number | null;
  debtIncomeRatio?: number | string | null;
  loanPrincipal?: number | string | null;
  avgSalary?: number | string | null;
}
