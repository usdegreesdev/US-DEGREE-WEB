import { getTestingRequirementsForCategory } from "@/data/testingRequirements";
import { TestingRequirementsDisclosure } from "@/types/university/AdmissionsTabContent";
import { UniversitySearchParams } from "@/types/university/apiResponses";
import { UniversityApiBundle } from "./fetchUniversityData";

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

// Sticker-price fallbacks used when the tuition endpoint omits a component.
const DEFAULT_TUITION_IN_STATE = 12714;
const DEFAULT_BOOK_SUPPLY = 1200;
const DEFAULT_ROOM_BOARD_ON_CAMPUS = 7348;
const DEFAULT_OTHER_EXPENSE_ON_CAMPUS = 2832;

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

  const type = sParams.type || collegeData?.school_type || "Private Research";

  const admissionRateRaw =
    sParams.admissionRate ||
    (apiData?.admissions?.admission_rate !== null &&
    apiData?.admissions?.admission_rate !== undefined
      ? `${(Number(apiData.admissions.admission_rate) * 100).toFixed(1)}%`
      : null) ||
    "N/A";

  // Calculate real sticker price if tuitionData is available
  let calculatedStickerPriceString = "N/A";
  if (tuitionData) {
    const tuitionInState =
      tuitionData.tuition?.tuition_in_state ?? DEFAULT_TUITION_IN_STATE;
    const bookSupply = tuitionData.tuition?.booksupply ?? DEFAULT_BOOK_SUPPLY;
    const roomBoardOnCampus =
      tuitionData.housing?.roomboard_oncampus ?? DEFAULT_ROOM_BOARD_ON_CAMPUS;
    const otherExpenseOnCampus =
      tuitionData.expenses?.otherexpense_oncampus ??
      DEFAULT_OTHER_EXPENSE_ON_CAMPUS;
    const stickerInState =
      bookSupply + tuitionInState + roomBoardOnCampus + otherExpenseOnCampus;
    calculatedStickerPriceString = `$${Math.round(stickerInState).toLocaleString()}`;
  }

  const tuitionRaw = tuitionData
    ? calculatedStickerPriceString
    : sParams.tuition || "N/A";

  const degree = sParams.degree || "Bachelor's Degree";

  const cipCode = resolvedCip || "N/A";

  // Student body stats from API overview details
  const totalStudents =
    apiData?.students?.size !== null && apiData?.students?.size !== undefined
      ? Number(apiData.students.size)
      : null;

  const rawFacultyRatio =
    campusData?.campus?.student_faculty_ratio ||
    apiData?.students?.student_faculty_ratio;
  const facultyRatio = rawFacultyRatio
    ? String(rawFacultyRatio).includes(":")
      ? String(rawFacultyRatio)
      : `${rawFacultyRatio}:1`
    : "N/A";

  const rawRetention = apiData?.students?.retention_rate;
  const retentionRate =
    rawRetention !== null && rawRetention !== undefined
      ? `${(Number(rawRetention) * 100).toFixed(0)}%`
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
      ? `${Number(rawCompletion).toFixed(0)}%`
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

  const applicants = apiData?.students?.fafsa_applications
    ? String(apiData.students.fafsa_applications)
    : "N/A";

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
          disclaimerTier: (Number(admissionsRaw.disclaimerTier) ||
            1) as TestingRequirementsDisclosure["disclaimerTier"],
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
    sanitizeSalary(resolvedEarnings?.year_1?.value) ||
    sanitizeSalary(outcomesData?.earnings?.year_1) ||
    sanitizeSalary(apiData?.earnings?.year_1) ||
    null;
  const salaryYear5 =
    sanitizeSalary(resolvedEarnings?.year_5?.value) ||
    sanitizeSalary(outcomesData?.earnings?.year_5) ||
    sanitizeSalary(apiData?.earnings?.year_5) ||
    null;
  const salaryYear10 =
    sanitizeSalary(resolvedEarnings?.year_10?.value) ||
    sanitizeSalary(outcomesData?.earnings?.year_10) ||
    sanitizeSalary(apiData?.earnings?.year_10) ||
    null;

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

  const netRoi20Yr =
    sParams.roi ||
    outcomesData?.roi?.roi_20yr ||
    apiData?.roi?.roi_20yr ||
    null;

  const rawGrowth =
    outcomesData?.earnings?.growth_rate || apiData?.earnings?.growth_rate;
  const growthRate =
    rawGrowth !== undefined && rawGrowth !== null
      ? Number(rawGrowth)
      : salaryYear1 && salaryYear10
        ? ((Number(salaryYear10) - Number(salaryYear1)) / Number(salaryYear1)) *
          100
        : null;

  const empFactor =
    outcomesData?.completion?.emp_factor !== null &&
    outcomesData?.completion?.emp_factor !== undefined
      ? Number(outcomesData.completion.emp_factor)
      : null;

  const debtIncomeRatio =
    outcomesData?.debt_income_ratio?.debt_income_ratio !== null &&
    outcomesData?.debt_income_ratio?.debt_income_ratio !== undefined
      ? Number(outcomesData.debt_income_ratio.debt_income_ratio)
      : null;

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
    rank: "N/A",
    admissionRate: admissionRateRaw,
    tuitionFee: tuitionRaw,
    logoColor: "",
    description:
      apiData?.school?.school_description ||
      `${name} is a distinguished institution situated in ${location}. It offers a wide range of academic opportunities and a vibrant student environment.`,
    degree,
    credentialLevel,
    credentialTitle,
    format: "Full-time, On-campus",
    financialAid: "Available",
    cipCode,
    programDescription: degree
      ? `The ${degree} program at ${name} is designed to provide comprehensive, top-tier training in the discipline, combining foundational principles with modern applications.`
      : "Information about this program is currently being updated by the university.",
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
    empFactor,
    debtIncomeRatio,
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
