"use client";

import React, { useState, useEffect } from "react";
import { X, DollarSign, Percent, Info, Users, BookOpen } from "lucide-react";
import StatsGrid from "@/components/university/StatsGrid";
import EarningsMethodBadge from "@/components/common/EarningsMethodBadge";
import {
  College,
  CollegeDetail,
  ApiNumber,
  OverviewResponse,
  CollegeSummaryResponse,
  OutcomesResponse,
} from "@/types/university/ComparisonTable";
import { toSafeHttpUrl } from "@/lib/url/httpUrl";
import { deriveCampusDemographics } from "@/lib/university/campusDemographics";

interface CollegeDetailsModalProps {
  collegeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  cache: Record<string, CollegeDetail>;
  setCache: React.Dispatch<React.SetStateAction<Record<string, CollegeDetail>>>;
  comparedColleges: College[];
}

export default function CollegeDetailsModal({
  collegeId,
  isOpen,
  onClose,
  cache,
  setCache,
  comparedColleges,
}: CollegeDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animProgress, setAnimProgress] = useState(0);

  // `data` is derived from the cache the fetch effect populates — no separate state needed.
  const data: CollegeDetail | null =
    isOpen && collegeId ? (cache[collegeId] ?? null) : null;

  // Esc key and scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Parallel data fetching with client caching. `data` is derived from `cache`, so this
  // effect only needs to populate the cache (no synchronous setState in the effect body).
  useEffect(() => {
    if (!isOpen || !collegeId) return;
    if (cache[collegeId]) return;

    let cancelled = false;

    const toPercentVal = (val: ApiNumber, fallback?: number): number | null => {
      if (val === null || val === undefined)
        return fallback !== undefined ? fallback : null;
      const num = Number(val);
      if (isNaN(num)) return fallback !== undefined ? fallback : null;
      return num < 2 ? Math.round(num * 100) : Math.round(num);
    };

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      const apiUrl = "/api/proxy";

      const sanitizeSalary = (val: ApiNumber): number | null => {
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

      try {
        // `collegeId` is the matrix entry id (unitid, or `unitid~cipCode` when
        // this college is compared under more than one program) — resolve the
        // real unitid up front so every backend call below targets the actual
        // college, not the composite entry id.
        const matchedCollege = comparedColleges?.find(
          (c) => String(c.id) === String(collegeId),
        );
        const actualId = matchedCollege?.unitid || collegeId;

        // Stage 1: Fetch overview and the tuition+campus summary in parallel.
        // `colleges/{id}` used to be fetched here too, but every field it can
        // return (school_name/name/city/state/control/school_url) is already
        // present on `overview.school`, so it was a pure duplicate call.
        // `/tuition/{id}` and `/campus/{id}` are likewise merged server-side
        // into `/college-summary/{id}` (same field paths, one response).
        const [overviewRes, summaryRes] = await Promise.all([
          fetch(`${apiUrl}/overview/${actualId}/default`),
          fetch(`${apiUrl}/college-summary/${actualId}`),
        ]);

        let overviewData: OverviewResponse = {};
        let summaryData: CollegeSummaryResponse = {};

        if (overviewRes.ok) overviewData = await overviewRes.json();
        if (summaryRes.ok) summaryData = await summaryRes.json();

        // Stage 2: Fetch outcomes details with resolved program cip_code
        const cipCode =
          matchedCollege?.cipCode || overviewData?.program?.cip_code || "default";
        let outcomesData: OutcomesResponse = {};
        try {
          const outcomesRes = await fetch(
            `${apiUrl}/outcomes/${actualId}/${cipCode}`,
          );
          if (outcomesRes.ok) {
            outcomesData = await outcomesRes.json();
          }
        } catch (e) {
          console.error("Outcomes fetch failed:", e);
        }

        const name =
          matchedCollege?.name ||
          overviewData?.school_name ||
          overviewData?.school?.school_name ||
          overviewData?.school?.name ||
          "Unknown University";

        const city = overviewData?.school?.city || "";
        const state = overviewData?.school?.state || "";
        const location =
          matchedCollege?.location ||
          (city && state
            ? `${city}, ${state}`
            : city || state || "Unknown Location");
        const control =
          overviewData?.school?.control ||
          (matchedCollege?.isPrivate ? "Private" : "Public");
        const type = control.toLowerCase().includes("private")
          ? "Private"
          : "Public";

        const safeSchoolUrl = toSafeHttpUrl(overviewData?.school?.school_url);
        const logo =
          matchedCollege?.logo ||
          (safeSchoolUrl
            ? `https://logo.clearbit.com/${new URL(safeSchoolUrl).hostname}`
            : null) ||
          `https://logo.clearbit.com/google.com`;

        // Same sources as the university page tabs; no fallback values.
        const totalStudents =
          overviewData?.students?.size !== null &&
          overviewData?.students?.size !== undefined
            ? Number(overviewData.students.size)
            : null;

        // Campus data (as the page uses) first, then the overview's ratio.
        const rawFacultyRatio =
          summaryData?.campus?.student_faculty_ratio ||
          overviewData?.students?.student_faculty_ratio;
        const facultyRatio = rawFacultyRatio
          ? String(rawFacultyRatio).includes(":")
            ? String(rawFacultyRatio)
            : `${rawFacultyRatio}:1`
          : "N/A";

        const rawRetention = overviewData?.students?.retention_rate;
        const retentionRate =
          rawRetention !== null && rawRetention !== undefined
            ? `${(Number(rawRetention) * 100).toFixed(0)}%`
            : "N/A";

        const programs =
          overviewData?.school?.program_count !== null &&
          overviewData?.school?.program_count !== undefined
            ? Number(overviewData.school.program_count)
            : null;

        const fafsaApplications =
          overviewData?.students?.fafsa_applications !== null &&
          overviewData?.students?.fafsa_applications !== undefined
            ? Number(overviewData.students.fafsa_applications)
            : null;

        const rawCompletion = overviewData?.completion?.completion_rate;
        const completionRate =
          rawCompletion !== null && rawCompletion !== undefined
            ? `${Number(rawCompletion).toFixed(0)}%`
            : "N/A";

        // Tuition & Costs tab: "Tuition In State" / "Tuition Out State"
        // come straight from /tuition (tuition_in_state / tuition_out_state).
        const tuitionInState =
          summaryData?.tuition?.tuition_in_state !== null &&
          summaryData?.tuition?.tuition_in_state !== undefined
            ? Number(summaryData.tuition.tuition_in_state)
            : null;
        const tuitionOutOfState =
          summaryData?.tuition?.tuition_out_state !== null &&
          summaryData?.tuition?.tuition_out_state !== undefined
            ? Number(summaryData.tuition.tuition_out_state)
            : null;

        const satReadingWriting =
          overviewData?.admissions?.sat_rw_min !== null &&
          overviewData?.admissions?.sat_rw_max !== null &&
          overviewData?.admissions?.sat_rw_min !== undefined &&
          overviewData?.admissions?.sat_rw_max !== undefined
            ? `${overviewData.admissions.sat_rw_min} - ${overviewData.admissions.sat_rw_max}`
            : null;

        const satMath =
          overviewData?.admissions?.sat_math_min !== null &&
          overviewData?.admissions?.sat_math_max !== null &&
          overviewData?.admissions?.sat_math_min !== undefined &&
          overviewData?.admissions?.sat_math_max !== undefined
            ? `${overviewData.admissions.sat_math_min} - ${overviewData.admissions.sat_math_max}`
            : null;

        const satAverage =
          overviewData?.admissions?.sat_avg_overall !== null &&
          overviewData?.admissions?.sat_avg_overall !== undefined
            ? String(overviewData.admissions.sat_avg_overall)
            : null;

        const acceptanceRate =
          overviewData?.admissions?.admission_rate !== null &&
          overviewData?.admissions?.admission_rate !== undefined
            ? `${(Number(overviewData.admissions.admission_rate) * 100).toFixed(1)}%`
            : "N/A";

        const repaymentRate3YrVal = toPercentVal(
          summaryData?.repayment?.all_borrowers_3yr,
        );
        const graduates3yr =
          repaymentRate3YrVal !== null ? `${repaymentRate3YrVal}%` : "N/A";

        // Salaries — same per-metric cohort resolution as the main
        // Outcomes & Careers page (src/lib/university/buildUniversityViewData.ts):
        // year_1/5/10 are each resolved independently against whichever
        // grad_cohort has the best data for that specific horizon, and can
        // legitimately come from different cohorts. `earnings_resolved` is
        // preferred; the flat `earnings.year_N` fields are kept only as a
        // fallback for responses that haven't been upgraded yet.
        const resolvedEarnings =
          outcomesData?.earnings_resolved ?? overviewData?.earnings_resolved;

        const salaryYear1 =
          sanitizeSalary(resolvedEarnings?.year_1?.value) ||
          sanitizeSalary(outcomesData?.earnings?.year_1) ||
          sanitizeSalary(overviewData?.earnings?.year_1) ||
          null;
        const salaryYear5 =
          sanitizeSalary(resolvedEarnings?.year_5?.value) ||
          sanitizeSalary(outcomesData?.earnings?.year_5) ||
          sanitizeSalary(overviewData?.earnings?.year_5) ||
          null;
        const salaryYear10 =
          sanitizeSalary(resolvedEarnings?.year_10?.value) ||
          sanitizeSalary(outcomesData?.earnings?.year_10) ||
          sanitizeSalary(overviewData?.earnings?.year_10) ||
          null;

        const salaryYear1Method =
          resolvedEarnings?.year_1?.method ??
          outcomesData?.earnings?.year_1_method ??
          overviewData?.earnings?.year_1_method ??
          null;
        const salaryYear5Method =
          resolvedEarnings?.year_5?.method ??
          outcomesData?.earnings?.year_5_method ??
          overviewData?.earnings?.year_5_method ??
          null;
        const salaryYear10Method =
          resolvedEarnings?.year_10?.method ??
          outcomesData?.earnings?.year_10_method ??
          overviewData?.earnings?.year_10_method ??
          null;

        // Cohort attribution has no legacy equivalent — only earnings_resolved
        // carries it.
        const salaryYear1Cohort = resolvedEarnings?.year_1?.cohort ?? null;
        const salaryYear5Cohort = resolvedEarnings?.year_5?.cohort ?? null;
        const salaryYear10Cohort = resolvedEarnings?.year_10?.cohort ?? null;

        // Gender distribution — identical to the Campus & Students tab.
        const {
          menStudentsPct,
          womenStudentsPct,
          menFacultyPct,
          womenFacultyPct,
        } = deriveCampusDemographics(summaryData);

        const resolvedData: CollegeDetail = {
          name,
          location,
          type,
          logo,
          totalStudents,
          facultyRatio,
          retentionRate,
          programs,
          fafsaApplications,
          completionRate,
          tuitionInState,
          tuitionOutOfState,
          satReadingWriting,
          satMath,
          satAverage,
          acceptanceRate,
          graduates3yr,
          salaryYear1,
          salaryYear5,
          salaryYear10,
          salaryYear1Method,
          salaryYear5Method,
          salaryYear10Method,
          salaryYear1Cohort,
          salaryYear5Cohort,
          salaryYear10Cohort,
          menStudentsPct,
          womenStudentsPct,
          menFacultyPct,
          womenFacultyPct,
        };

        if (cancelled) return;
        setCache((prev) => ({ ...prev, [collegeId]: resolvedData }));
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("Failed to fetch college details.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [collegeId, isOpen, cache, setCache, comparedColleges]);

  // Curve anim progress — driven by requestAnimationFrame so setState only runs in async callbacks.
  useEffect(() => {
    if (!data) return;

    const duration = 800;
    let raf = 0;
    let start: number | null = null;

    const tick = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimProgress(eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data]);

  if (!isOpen) return null;

  // Format Helper
  const formatCurrency = (val: number | string | null | undefined) => {
    if (val === null || val === undefined) return "N/A";
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return `$${Math.round(num).toLocaleString()}`;
  };

  // Trajectory Helper
  let trajectoryPoints: { label: string; val: number }[] = [];
  let coords: { x: number; y: number }[] = [];
  let pathD = "";
  let fillD = "";
  const chartWidth = 600;
  const chartHeight = 220;
  const paddingLeft = 60;
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 30;
  let minVal = 40000;
  let maxVal = 100000;
  let safeDiff = 60000;
  let hasSalaryData = false;

  if (data) {
    const s1 = data.salaryYear1;
    const s5 = data.salaryYear5;
    const s10 = data.salaryYear10;
    hasSalaryData = s1 !== null || s5 !== null || s10 !== null;

    const s1Val =
      s1 ?? (s5 ? Math.round(s5 / 1.3) : s10 ? Math.round(s10 / 1.6) : 40000);
    const s5Val = s5 ?? Math.round(s1Val * 1.3);
    const s10Val = s10 ?? Math.round(s5Val * 1.25);
    const s15Val = Math.round(s10Val * 1.25);
    const s20Val = Math.round(s10Val * 1.5);

    trajectoryPoints = [
      { label: "ENTRY", val: s1Val },
      { label: "YEAR 5", val: s5Val },
      { label: "YEAR 10", val: s10Val },
      { label: "YEAR 15", val: s15Val },
      { label: "YEAR 20", val: s20Val },
    ];

    maxVal = s20Val * 1.1;
    minVal = s1Val * 0.8;
    const diffVal = maxVal - minVal;
    safeDiff = diffVal === 0 ? 1 : diffVal;
    const baselineY = chartHeight - paddingBottom;

    coords = trajectoryPoints.map((pt, i) => {
      const x =
        paddingLeft +
        (i * (chartWidth - paddingLeft - paddingRight)) /
          (trajectoryPoints.length - 1);
      const targetY =
        chartHeight -
        paddingBottom -
        ((pt.val - minVal) * (chartHeight - paddingTop - paddingBottom)) /
          safeDiff;
      const y = baselineY + (targetY - baselineY) * animProgress;
      return { x, y };
    });

    pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 3;
      const cpY1 = curr.y;
      const cpX2 = curr.x + (2 * (next.x - curr.x)) / 3;
      const cpY2 = next.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }

    fillD = `${pathD} L ${coords[coords.length - 1].x} ${chartHeight - paddingBottom} L ${coords[0].x} ${chartHeight - paddingBottom} Z`;
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden relative border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer z-50 border border-slate-100"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="px-6 pt-8 pb-4 md:px-10 border-b border-slate-100 shrink-0 bg-[#FAFBFD]">
          {!data ? (
            <div className="animate-pulse space-y-2.5 py-2">
              <div className="h-7 bg-slate-200 rounded-lg w-1/3"></div>
              <div className="h-4 bg-slate-100 rounded-lg w-1/4"></div>
            </div>
          ) : (
            <div className="py-2 flex items-center gap-4">
              {/* Logo */}
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white border border-slate-100 rounded-xl p-1.5 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                  <div className="w-full h-full rounded bg-blue-100 flex items-center justify-center font-bold text-[#3F51B5] text-xs md:text-base select-none">
                    {data.name ? data.name.trim().charAt(0).toUpperCase() : "U"}
                  </div>
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                  {data.name}
                </h2>
                <p className="text-xs md:text-sm font-bold text-[#3F51B5] mt-1 uppercase tracking-wider">
                  {data.location} • {data.type}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 main-scrollbar space-y-12 bg-white">
          {!data ? (
            isLoading || !error ? (
              // Skeleton Loader
              <div className="space-y-10 animate-pulse">
                <div className="space-y-4">
                  <div className="h-4 bg-slate-200 rounded-full w-24"></div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="h-24 bg-slate-100 rounded-3xl"
                      ></div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-slate-200 rounded-full w-32"></div>
                  <div className="grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-20 bg-slate-100 rounded-2xl"
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-red-500 font-bold">{error}</p>
              </div>
            )
          ) : (
            <>
              {/* 1. Overview Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Info size={14} className="text-[#3F51B5]" />
                  University Overview
                </h3>
                <StatsGrid
                  totalStudents={data.totalStudents}
                  facultyRatio={data.facultyRatio}
                  retentionRate={data.retentionRate}
                  programs={data.programs}
                  fafsaApplications={data.fafsaApplications}
                  completionRate={data.completionRate}
                />
              </section>

              {/* 2. Program Metrics Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <BookOpen size={14} className="text-[#3F51B5]" />
                  Program Metrics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#FAFBFD] border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Acceptance Rate
                    </p>
                    <p className="text-lg font-extrabold text-slate-900 mt-1">
                      {data.acceptanceRate}
                    </p>
                  </div>
                  <div className="bg-[#FAFBFD] border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Repayment Rate (3-Year)
                    </p>
                    <p className="text-lg font-extrabold text-slate-900 mt-1">
                      {data.graduates3yr}
                    </p>
                  </div>
                  <div className="bg-[#FAFBFD] border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Tuition (EST.) Per Year
                    </p>
                    <p className="text-xs font-extrabold text-slate-900 mt-1 leading-snug">
                      {formatCurrency(data.tuitionInState)} (In-state) /{" "}
                      {formatCurrency(data.tuitionOutOfState)} (Out-of-state)
                      <span className="block text-[8px] text-gray-400 uppercase font-bold mt-0.5">
                        per year
                      </span>
                    </p>
                  </div>
                </div>
              </section>

              {/* 3. Admissions Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Users size={14} className="text-[#3F51B5]" />
                  Admissions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#FAFBFD] border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      SAT Reading & Writing
                    </p>
                    <p className="text-base font-extrabold text-slate-800 mt-1">
                      {data.satReadingWriting || (
                        <span className="text-slate-400 text-xs italic font-medium">
                          Data Not Available
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="bg-[#FAFBFD] border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      SAT Math
                    </p>
                    <p className="text-base font-extrabold text-slate-800 mt-1">
                      {data.satMath || (
                        <span className="text-slate-400 text-xs italic font-medium">
                          Data Not Available
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="bg-[#FAFBFD] border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      SAT Composite (Average)
                    </p>
                    <p className="text-base font-extrabold text-slate-800 mt-1">
                      {data.satAverage || (
                        <span className="text-slate-400 text-xs italic font-medium">
                          Data Not Available
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </section>

              {/* 4. Outcomes & Careers Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <DollarSign size={14} className="text-[#3F51B5]" />
                  Outcomes & Careers
                </h3>

                {/* Median Salary Blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {/* 1 Year */}
                  <div className="bg-[#FEF9C3]/80 border border-yellow-100 rounded-3xl p-6 flex flex-col justify-center min-h-[108px] shadow-sm">
                    <p className="flex items-center gap-1 text-[11px] font-bold text-gray-400 mb-1">
                      1 Year
                      {data.salaryYear1Method && (
                        <EarningsMethodBadge
                          method={data.salaryYear1Method}
                          cohort={data.salaryYear1Cohort}
                        />
                      )}
                    </p>
                    <p className="text-3xl font-black text-[#16A34A] tracking-tight">
                      {data.salaryYear1 ? (
                        formatCurrency(data.salaryYear1 * animProgress)
                      ) : (
                        <span className="text-gray-300 text-xl">No data</span>
                      )}
                    </p>
                    {data.salaryYear1Cohort && (
                      <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                        Data from {data.salaryYear1Cohort} LEHD Graduation Report
                      </p>
                    )}
                  </div>

                  {/* 5 Year */}
                  <div className="bg-[#FEE2E2]/80 border border-red-100 rounded-3xl p-6 flex flex-col justify-center min-h-[108px] shadow-sm">
                    <p className="flex items-center gap-1 text-[11px] font-bold text-gray-400 mb-1">
                      5 Year
                      {data.salaryYear5Method && (
                        <EarningsMethodBadge
                          method={data.salaryYear5Method}
                          cohort={data.salaryYear5Cohort}
                        />
                      )}
                    </p>
                    <p className="text-3xl font-black text-[#16A34A] tracking-tight">
                      {data.salaryYear5 ? (
                        formatCurrency(data.salaryYear5 * animProgress)
                      ) : (
                        <span className="text-gray-300 text-xl">No data</span>
                      )}
                    </p>
                    {data.salaryYear5Cohort && (
                      <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                        Data from {data.salaryYear5Cohort} LEHD Graduation Report
                      </p>
                    )}
                  </div>

                  {/* 10 Year */}
                  <div className="bg-[#EEF2FF]/80 border border-indigo-100 rounded-3xl p-6 flex flex-col justify-center min-h-[108px] shadow-sm">
                    <p className="flex items-center gap-1 text-[11px] font-bold text-gray-400 mb-1">
                      10 Year
                      {data.salaryYear10Method && (
                        <EarningsMethodBadge
                          method={data.salaryYear10Method}
                          cohort={data.salaryYear10Cohort}
                        />
                      )}
                    </p>
                    <p className="text-3xl font-black text-[#16A34A] tracking-tight">
                      {data.salaryYear10 ? (
                        formatCurrency(data.salaryYear10 * animProgress)
                      ) : (
                        <span className="text-gray-300 text-xl">No data</span>
                      )}
                    </p>
                    {data.salaryYear10Cohort && (
                      <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                        Data from {data.salaryYear10Cohort} LEHD Graduation Report
                      </p>
                    )}
                  </div>
                </div>

                {/* Salary Trajectory Chart */}
                <div className="bg-[#FAFBFD] border border-slate-100 rounded-[2rem] p-6 shadow-sm mt-4">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 font-poppins">
                    Salary Trajectory
                  </h4>
                  {hasSalaryData ? (
                    <div className="w-full overflow-x-auto">
                      <svg
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="w-full min-w-[500px] h-auto overflow-visible"
                      >
                        <defs>
                          <linearGradient
                            id="modalChartGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#3B82F6"
                              stopOpacity="0.2"
                            />
                            <stop
                              offset="100%"
                              stopColor="#3B82F6"
                              stopOpacity="0.0"
                            />
                          </linearGradient>
                          <clipPath id="modalChartClip">
                            <rect
                              x="0"
                              y="0"
                              width={chartWidth * animProgress}
                              height={chartHeight}
                            />
                          </clipPath>
                        </defs>

                        {/* Y Axis Grid Lines */}
                        {[minVal, (minVal + maxVal) / 2, maxVal].map(
                          (yVal, i) => {
                            const y =
                              chartHeight -
                              paddingBottom -
                              ((yVal - minVal) *
                                (chartHeight - paddingTop - paddingBottom)) /
                                safeDiff;
                            return (
                              <g key={i}>
                                <line
                                  x1={paddingLeft}
                                  y1={y}
                                  x2={chartWidth - paddingRight}
                                  y2={y}
                                  stroke="#F3F4F6"
                                  strokeWidth="1.5"
                                />
                                <text
                                  x={paddingLeft - 10}
                                  y={y + 4}
                                  textAnchor="end"
                                  className="text-[9px] font-black text-gray-400"
                                >
                                  {formatCurrency(yVal)}
                                </text>
                              </g>
                            );
                          },
                        )}

                        {/* Area Fill */}
                        <path
                          d={fillD}
                          fill="url(#modalChartGradient)"
                          clipPath="url(#modalChartClip)"
                        />

                        {/* Line Curve */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          clipPath="url(#modalChartClip)"
                        />

                        {/* Circle Markers */}
                        {coords.map((coord, i) => {
                          const dotVisible =
                            chartWidth * animProgress >= coord.x;
                          return (
                            <circle
                              key={i}
                              cx={coord.x}
                              cy={coord.y}
                              r={dotVisible ? 5 : 0}
                              fill="#FFFFFF"
                              stroke="#3B82F6"
                              strokeWidth="3.5"
                              style={{
                                transition:
                                  "r 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                              }}
                            />
                          );
                        })}

                        {/* X Axis Labels */}
                        {coords.map((coord, i) => (
                          <text
                            key={i}
                            x={coord.x}
                            y={chartHeight - paddingBottom + 18}
                            textAnchor="middle"
                            className="text-[9px] font-black fill-gray-400 uppercase tracking-wider"
                          >
                            {trajectoryPoints[i].label}
                          </text>
                        ))}
                      </svg>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                      <p className="text-xs font-semibold">
                        Salary trajectory data is not available
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* 5. Campus & Students Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Percent size={14} className="text-[#3F51B5]" />
                  Campus & Students
                </h3>
                <div className="bg-[#FAFBFD] border border-slate-100 rounded-[2rem] p-6 md:p-8 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-800 mb-6 font-poppins">
                    Gender Distribution
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-x-12">
                    {/* Student Men */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>Men (Students)</span>
                        <span>
                          {data.menStudentsPct !== null
                            ? `${(data.menStudentsPct * animProgress).toFixed(1)}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF5A5A] rounded-full transition-all"
                          style={{
                            width: `${(data.menStudentsPct ?? 0) * animProgress}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Faculty Men */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>Men (Faculty)</span>
                        <span>
                          {data.menFacultyPct !== null
                            ? `${(data.menFacultyPct * animProgress).toFixed(1)}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF5A5A] rounded-full transition-all"
                          style={{
                            width: `${(data.menFacultyPct ?? 0) * animProgress}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Student Women */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>Women (Students)</span>
                        <span>
                          {data.womenStudentsPct !== null
                            ? `${(data.womenStudentsPct * animProgress).toFixed(1)}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#EC4899] rounded-full transition-all"
                          style={{
                            width: `${(data.womenStudentsPct ?? 0) * animProgress}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Faculty Women */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>Women (Faculty)</span>
                        <span>
                          {data.womenFacultyPct !== null
                            ? `${(data.womenFacultyPct * animProgress).toFixed(1)}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#EC4899] rounded-full transition-all"
                          style={{
                            width: `${(data.womenFacultyPct ?? 0) * animProgress}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Bottom Muted Informational Note */}
              <div className="pt-6 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-center gap-2 text-slate-400">
                <Info size={14} className="shrink-0 text-[#3F51B5]" />
                <p className="text-[11px] md:text-xs text-slate-500 font-medium tracking-wide text-center leading-normal select-none">
                  Designed for quick evaluation and informed decision-making.
                  Access complete institutional profiles, program details,
                  admissions information, and additional insights by exploring
                  colleges and programs through the dedicated search experience.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
