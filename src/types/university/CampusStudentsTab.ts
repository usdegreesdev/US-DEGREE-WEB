// Backend value that may arrive as a number, a numeric string, or be missing.
type ApiNum = number | string | null | undefined;

export interface CampusData {
  campus?: {
    size_category?: string | null;
    size?: ApiNum;
    // Comes as a bare number from one backend table and an "n:1" string from
    // another (see buildUniversityViewData's facultyRatio derivation).
    student_faculty_ratio?: ApiNum;
    avg_family_income?: ApiNum;
  };
  students?: {
    grad_students?: ApiNum;
    demographics?: { men?: ApiNum; women?: ApiNum };
    faculty?: { men?: ApiNum; women?: ApiNum };
    choice_aid?: ApiNum;
  };
  repayment?: {
    graduates_3yr?: ApiNum;
    non_completers_3yr?: ApiNum;
    yr1_overall?: ApiNum;
    yr3_overall?: ApiNum;
    yr3_completers?: ApiNum;
    yr3_noncompleters?: ApiNum;
  };
}

export interface CampusStudentsTabProps {
  campusData: CampusData | null;
  fafsaApplications?: number | null;
}
