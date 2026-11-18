import { retentionToPercent } from "@/lib/university/outcomeFormat";
import {
  inStateOnCampusSticker,
  stickerDisplay,
} from "@/lib/university/stickerPrice";
import { getTestingRequirementsForCategory } from "@/data/testingRequirements";
import { TestingRequirementsDisclosure } from "@/types/university/AdmissionsTabContent";
import { UniversitySearchParams } from "@/types/university/apiResponses";
import { UniversityApiBundle } from "./fetchUniversityData";
import { formatPercent } from "@/lib/fieldScale";
import { firstReal } from "@/lib/firstReal";
import { NOT_PUBLISHED } from "@/lib/notPublished";

const sanitizeSalary = (val: unknown) => {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (
    str === "No Value" ||
    str === "N/A" ||
    str === "" ||
    str.toLowerCase() === "null"
  ) {
    return null;
  }
  const num = Number(str.replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? null : num;
};

/** The category's real disclaimer tier (1–3), or null — never a default 1. */
const toDisclaimerTier = (
  v: unknown,
): TestingRequirementsDisclosure["disclaimerTier"] => {
  const n = v === null || v === undefined || v === "" ? null : Number(v);
  return n === 1 || n === 2 || n === 3 ? n : null;
};


export async function buildUniversityViewData(
  id: string,
  sParams: UniversitySearchParams,
  bundle: UniversityApiBundle,
) {
  const {
    apiData,
    outcomesData,
    campusData,
    tuitionData,
    collegeData,
    programsData,
    fetchedAccreditor,
    resolvedCip,
    athleticsData,
  } = bundle;

  // 3. Build the final data object, prioritizing sParams first, then apiData / collegeData
  const name = sParams.name || collegeData?.school_name || "Unknown University";
  const city = sParams.city || collegeData?.city || "";
  const state = sParams.state || collegeData?.state || "";
  const location =
    city && state ? `${city}, ${state}` : city || state || "Unknown Location";

  // Real school type or null — never a default label.
  const type: string | null = sParams.type || collegeData?.school_type || null;

  const admissionRateRaw =
    sParams.admissionRate ||
    (apiData?.admissions?.admission_rate !== null &&
    apiData?.admissions?.admission_rate !== undefined
      ? formatPercent("admissions.admission_rate", apiData.admissions.admission_rate, 1)
      : null) ||
    "N/A";

  // In-state, on-campus sticker price: the sum of the four published
  // components, or not published with the missing components named — the
  // same rule as the PDF report. Never a default for a missing component.
  // Without a tuition response the components are unknown, so the total is
  // whatever the search card carried in the URL (itself a NULL-propagating
  // SQL sum), or not published.
  const sticker = tuitionData
    ? inStateOnCampusSticker({
        tuition_in_state: tuitionData.tuition?.tuition_in_state,
        roomboard_oncampus: tuitionData.housing?.roomboard_oncampus,
        booksupply: tuitionData.tuition?.booksupply,
        otherexpense_oncampus: tuitionData.expenses?.otherexpense_oncampus,
      })
    : null;
  const urlTuition =
    sParams.tuition !== undefined &&
    sParams.tuition !== null &&
    sParams.tuition !== "" &&
    sParams.tuition !== "N/A"
      ? sParams.tuition
      : null;
  const tuitionRaw: string | null = sticker
    ? sticker.published
      ? stickerDisplay(sticker)
      : null
    : urlTuition;
  const tuitionFeeMissing: string[] = sticker ? sticker.missing : [];

  // The program title carried from search, or null — never a default degree.
  const degree: string | null = sParams.degree || null;

  const cipCode = resolvedCip || "N/A";

  // Student body stats from API overview details
  const totalStudents =
    apiData?.students?.size !== null && apiData?.students?.size !== undefined
      ? Number(apiData.students.size)
      : null;

  const rawFacultyRatio =
    campusData?.campus?.student_faculty_ratio ??
    apiData?.students?.student_faculty_ratio;
  // Explicit null checks: a real 0 is not missing.
  const facultyRatio =
    rawFacultyRatio !== null && rawFacultyRatio !== undefined && rawFacultyRatio !== ""
      ? String(rawFacultyRatio).includes(":")
        ? String(rawFacultyRatio)
        : `${rawFacultyRatio}:1`
      : NOT_PUBLISHED;

  const rawRetention = apiData?.students?.retention_rate;
  const retentionRate =
    rawRetention !== null && rawRetention !== undefined
      ? formatPercent("students.retention_rate", rawRetention)
      : "N/A";

  const programs =
    apiData?.school?.program_count !== null &&
    apiData?.school?.program_count !== undefined
      ? Number(apiData.school.program_count)
      : null;

  const fafsaApplications =
    apiData?.students?.fafsa_applications !== null &&
    apiData?.students?.fafsa_applications !== undefined
      ? Number(apiData.students.fafsa_applications)
      : null;

  const rawCompletion = apiData?.completion?.completion_rate;
  const completionRate =
    rawCompletion !== null && rawCompletion !== undefined
      ? `${Number(rawCompletion).toFixed(1)}%`
      : "N/A";

  // SAT & Student metrics from API if present
  const satAverage =
    apiData?.admissions?.sat_avg_overall !== null &&
    apiData?.admissions?.sat_avg_overall !== undefined
      ? String(apiData.admissions.sat_avg_overall)
      : "N/A";

  const satReadingWriting =
    apiData?.admissions?.sat_rw_min !== null &&
    apiData?.admissions?.sat_rw_max !== null &&
    apiData?.admissions?.sat_rw_min !== undefined &&
    apiData?.admissions?.sat_rw_max !== undefined
      ? `${apiData.admissions.sat_rw_min} - ${apiData.admissions.sat_rw_max}`
      : "N/A";

  const satMath =
    apiData?.admissions?.sat_math_min !== null &&
    apiData?.admissions?.sat_math_max !== null &&
    apiData?.admissions?.sat_math_min !== undefined &&
    apiData?.admissions?.sat_math_max !== undefined
      ? `${apiData.admissions.sat_math_min} - ${apiData.admissions.sat_math_max}`
      : "N/A";

  const applicants =
    apiData?.students?.fafsa_applications !== null &&
    apiData?.students?.fafsa_applications !== undefined
      ? String(apiData.students.fafsa_applications)
      : NOT_PUBLISHED;

  // Testing-requirements disclosure. The overview endpoint returns a per-college
  // category code (`sat_disclosure_category`); the badge DISPLAY metadata comes
  // from the `admission_disclosure_categories` lookup table. Only build the
  // object when the college carries a category; otherwise leave it null so the
  // Admissions tab shows the numeric SAT range exactly as before.
  //
  // When the overview response already inlines the display fields, prefer those;
  // otherwise resolve them from the categories table by the category code.
  const admissionsRaw = apiData?.admissions;
  const disclosureCategory = admissionsRaw?.satDisclosureCategory ?? null;

  let testingRequirementsFinal: TestingRequirementsDisclosure | null = null;
  if (disclosureCategory != null) {
    testingRequirementsFinal = admissionsRaw?.badgeLabel
      ? {
          satDisclosureCategory: disclosureCategory,
          badgeLabel: admissionsRaw.badgeLabel,
          badgeColor: (admissionsRaw.badgeColor ??
            "gray") as TestingRequirementsDisclosure["badgeColor"],
          supportingCopy: admissionsRaw.supportingCopy ?? "",
          disclaimerTier: toDisclaimerTier(admissionsRaw.disclaimerTier),
          disclaimerText: admissionsRaw.disclaimerText ?? null,
          showAdmissionRateRequired: Boolean(
            admissionsRaw.showAdmissionRateRequired,
          ),
        }
      : await getTestingRequirementsForCategory(disclosureCategory);
  }

  // Outcomes & Careers statistics.
  //
  // year_1/5/10 are each resolved independently by the backend against
  // whichever grad_cohort has the best data for that specific horizon
  // (`earnings_resolved`) — they can legitimately come from different
  // cohorts. The old flat `earnings.year_N` fields reflected a single
  // implicitly-chosen cohort row and are kept only as a fallback for
  // responses that haven't been upgraded yet.
  const resolvedEarnings = outcomesData?.earnings_resolved;

  const salaryYear1 =
    firstReal(
      sanitizeSalary(resolvedEarnings?.year_1?.value),
      sanitizeSalary(outcomesData?.earnings?.year_1),
      sanitizeSalary(apiData?.earnings?.year_1),
    );
  const salaryYear5 =
    firstReal(
      sanitizeSalary(resolvedEarnings?.year_5?.value),
      sanitizeSalary(outcomesData?.earnings?.year_5),
      sanitizeSalary(apiData?.earnings?.year_5),
    );
  const salaryYear10 =
    firstReal(
      sanitizeSalary(resolvedEarnings?.year_10?.value),
      sanitizeSalary(outcomesData?.earnings?.year_10),
      sanitizeSalary(apiData?.earnings?.year_10),
    );

  const salaryYear1Method =
    resolvedEarnings?.year_1?.method ??
    outcomesData?.earnings?.year_1_method ??
    apiData?.earnings?.year_1_method ??
    null;
  const salaryYear5Method =
    resolvedEarnings?.year_5?.method ??
    outcomesData?.earnings?.year_5_method ??
    apiData?.earnings?.year_5_method ??
    null;
  const salaryYear10Method =
    resolvedEarnings?.year_10?.method ??
    outcomesData?.earnings?.year_10_method ??
    apiData?.earnings?.year_10_method ??
    null;

  // Cohort attribution has no legacy equivalent — only `earnings_resolved`
  // carries it. Shown next to each fill-method badge so users don't assume
  // the three figures come from the same graduating class.
  const salaryYear1Cohort = resolvedEarnings?.year_1?.cohort ?? null;
  const salaryYear5Cohort = resolvedEarnings?.year_5?.cohort ?? null;
  const salaryYear10Cohort = resolvedEarnings?.year_10?.cohort ?? null;

  // A real 0 (or negative) ROI is a value; only a missing one falls through.
  const netRoi20Yr = firstReal(
    sParams.roi,
    outcomesData?.roi?.roi_20yr,
    apiData?.roi?.roi_20yr,
  );

  const rawGrowth = firstReal(
    outcomesData?.earnings?.growth_rate,
    apiData?.earnings?.growth_rate,
  );
  const growthRate =
    rawGrowth !== undefined && rawGrowth !== null
      ? Number(rawGrowth)
      : salaryYear1 !== null && salaryYear1 !== 0 && salaryYear10 !== null
        ? ((Number(salaryYear10) - Number(salaryYear1)) / Number(salaryYear1)) *
          100
        : null;

  // First-year retention as a 0–100 percent (the column is a 0–1 fraction).
  const retentionPct = retentionToPercent(rawRetention);

  // School-level debt-to-income on the PDF report's basis (avg_debt ÷
  // school median earnings), with its own inputs and the report's wording.
  const dir = outcomesData?.debt_income_ratio;
  const debtIncomeRatio = firstReal(dir?.debt_income_ratio);
  const debtRatioDebt = firstReal(dir?.avg_debt);
  const debtRatioEarnings = firstReal(dir?.basis_earnings);
  const debtRatioBasisLabel = dir?.basis_label ?? null;
  const debtRatioDefinition = dir?.definition ?? null;

  const credentialLevel =
    apiData?.program?.credential_level !== null &&
    apiData?.program?.credential_level !== undefined
      ? Number(apiData.program.credential_level)
      : null;

  const credentialTitle = apiData?.program?.credential_title || null;

  const avgSalary =
    outcomesData?.earnings?.avg_salary !== null &&
    outcomesData?.earnings?.avg_salary !== undefined
      ? Number(outcomesData.earnings.avg_salary)
      : null;

  return {
    id,
    name,
    location,
    type,
    admissionRate: admissionRateRaw,
    tuitionFee: tuitionRaw,
    tuitionFeeMissing,
    logoColor: "",
    // The school's own description, or null — never a template.
    description: apiData?.school?.school_description || null,
    degree,
    credentialLevel,
    credentialTitle,
    cipCode,
    // No program description data exists; never a generated blurb.
    programDescription: null,
    applicants,
    satReadingWriting,
    satMath,
    satAverage,
    testingRequirements: testingRequirementsFinal,
    admissionsGlance: apiData?.admissions ?? null,

    // Dynamic Stats for StatsGrid
    totalStudents,
    facultyRatio,
    retentionRate,
    programs,
    fafsaApplications,
    completionRate,

    // Dynamic Outcomes
    salaryYear1,
    salaryYear5,
    salaryYear10,
    salaryYear1Method,
    salaryYear5Method,
    salaryYear10Method,
    salaryYear1Cohort,
    salaryYear5Cohort,
    salaryYear10Cohort,
    netRoi20Yr,
    growthRate,
    retentionPct,
    debtIncomeRatio,
    debtRatioDebt,
    debtRatioEarnings,
    debtRatioBasisLabel,
    debtRatioDefinition,
    avgSalary,

    // Campus Data
    campusData,

    // Tuition Data
    tuitionData,

    // Programs Data
    programsData,

    // Athletics Disclosure Data
    athleticsData,

    // School URL
    schoolUrl: collegeData?.school_url || null,
    accreditor:
      collegeData?.accreditor ||
      apiData?.school?.accreditor ||
      fetchedAccreditor ||
      null,
  };
}

export type UniversityViewData = Awaited<
  ReturnType<typeof buildUniversityViewData>
>;
