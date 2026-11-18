"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import { Info } from "lucide-react";
import { OutcomesSectionProps } from "@/types/university/OutcomesSection";
import DisclaimerTooltip from "@/components/common/DisclaimerTooltip";
import EarningsMethodBadge from "@/components/common/EarningsMethodBadge";
import SalaryTrajectoryChart from "@/components/common/SalaryTrajectoryChart";
import { DATA_SOURCE_DISCLAIMERS } from "@/constants/dataSourceDisclaimers";
import { EARNINGS_SKIPPED_METHODS } from "@/types/earningsMethod";
import {
  NOT_PUBLISHED,
  formatPercentOrNotPublished,
} from "@/lib/university/outcomeFormat";

/** A finite number, or null. Never substitutes a value; a real 0 stays 0. */
const toFiniteOrNull = (val: number | string | null | undefined) => {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

export default function OutcomesSection({
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
  retentionPct,
  debtIncomeRatio,
  debtRatioDebt,
  debtRatioEarnings,
  debtRatioBasisLabel,
  debtRatioDefinition,
}: OutcomesSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartGradientId = useId();
  const chartClipId = useId();
  const [hasAnimated, setHasAnimated] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 1000;
          const steps = 60;
          const stepTime = duration / steps;
          let step = 0;

          const timer = setInterval(() => {
            step++;
            const progress = Math.min(step / steps, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setAnimProgress(eased);

            if (step >= steps) {
              clearInterval(timer);
              setAnimProgress(1);
            }
          }, stepTime);
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  const formatCurrency = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined) return "N/A";
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return `$${Math.round(num).toLocaleString()}`;
  };

  const formatRoi = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined) return "N/A";
    const num = Number(val);
    if (isNaN(num)) return String(val);
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${Math.round(num / 1000)}K`;
    return `$${Math.round(num).toLocaleString()}`;
  };

  // 1. Median Salary values
  // AFTER
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

  const s1 = sanitizeSalary(salaryYear1);
  const s5 = sanitizeSalary(salaryYear5);
  const s10 = sanitizeSalary(salaryYear10);

  // 2. First-year retention (0–100 percent; null stays null, no fallback)
  const retention = retentionPct ?? null;

  // 3. Debt-to-income — the PDF report's figure: the school's typical debt ÷
  // the school's median earnings (DEBT_RATIO_BASIS in usdegrees-api), shown
  // as "X.XX : 1" (debt per $1 of earnings). The API computes it; a ratio
  // that is null or not above 0 means "no ratio", as in the report.
  const ratioValue = toFiniteOrNull(debtIncomeRatio);
  const debtRatio = ratioValue !== null && ratioValue > 0 ? ratioValue : null;
  // The ratio's own inputs (school-level), so the three figures agree.
  const avgDebt = toFiniteOrNull(debtRatioDebt);
  const earlyEarnings = toFiniteOrNull(debtRatioEarnings);

  // 4. Salary trajectory: only the published year-1/5/10 points (see
  // SalaryTrajectoryChart). Nothing interpolated, nothing past year 10.
  const hasSalaryData = s1 !== null || s5 !== null || s10 !== null;

  return (
    <div ref={containerRef} className="flex flex-col gap-10 py-6 max-w-4xl">
      {/* 1. Median Salary Section */}
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-4">
          MEDIAN SALARY
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
          {/* 1 Year */}
          <div
            className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-center min-h-[96px] sm:min-h-[108px] shadow-sm border ${
              salaryYear1Method && EARNINGS_SKIPPED_METHODS.has(salaryYear1Method)
                ? "bg-gray-50 border-gray-200"
                : "bg-[#FEF9C3]/80 border-yellow-100"
            }`}
          >
            <p className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-gray-400 mb-1">
              1 Year
              <DisclaimerTooltip text={DATA_SOURCE_DISCLAIMERS.censusLehd} />
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-[#16A34A] tracking-tight">
              {s1 != null ? (
                formatCurrency(s1 * animProgress)
              ) : (
                <span className="text-gray-300 text-xl sm:text-2xl md:text-3xl">
                  —
                </span>
              )}
            </p>
            {salaryYear1Method && (
              <div className="mt-2">
                <EarningsMethodBadge
                  method={salaryYear1Method}
                  cohort={salaryYear1Cohort}
                  variant="pill"
                />
              </div>
            )}
          </div>

          {/* 5 Year */}
          <div
            className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-center min-h-[96px] sm:min-h-[108px] shadow-sm border ${
              salaryYear5Method && EARNINGS_SKIPPED_METHODS.has(salaryYear5Method)
                ? "bg-gray-50 border-gray-200"
                : "bg-[#FEE2E2]/80 border-red-100"
            }`}
          >
            <p className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-gray-400 mb-1">
              5 Year
              <DisclaimerTooltip text={DATA_SOURCE_DISCLAIMERS.censusLehd} />
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-[#16A34A] tracking-tight">
              {s5 != null ? (
                formatCurrency(s5 * animProgress)
              ) : (
                <span className="text-gray-300 text-xl sm:text-2xl md:text-3xl">
                  —
                </span>
              )}
            </p>
            {salaryYear5Method && (
              <div className="mt-2">
                <EarningsMethodBadge
                  method={salaryYear5Method}
                  cohort={salaryYear5Cohort}
                  variant="pill"
                />
              </div>
            )}
          </div>

          {/* 10 Year */}
          <div
            className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-center min-h-[96px] sm:min-h-[108px] shadow-sm border col-span-2 sm:col-span-1 ${
              salaryYear10Method &&
              EARNINGS_SKIPPED_METHODS.has(salaryYear10Method)
                ? "bg-gray-50 border-gray-200"
                : "bg-[#EEF2FF]/80 border-indigo-100"
            }`}
          >
            <p className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-gray-400 mb-1">
              10 Year
              <DisclaimerTooltip text={DATA_SOURCE_DISCLAIMERS.censusLehd} />
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-[#16A34A] tracking-tight">
              {s10 != null ? (
                formatCurrency(s10 * animProgress)
              ) : (
                <span className="text-gray-300 text-xl sm:text-2xl md:text-3xl">
                  —
                </span>
              )}
            </p>
            {salaryYear10Method && (
              <div className="mt-2">
                <EarningsMethodBadge
                  method={salaryYear10Method}
                  cohort={salaryYear10Cohort}
                  variant="pill"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. First-year retention & ROI Side-by-Side */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full">
        {/* First-year retention */}
        <div className="bg-[#F0FDF4] border border-[#DCFCE7]/60 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm flex flex-col justify-between min-h-[130px] sm:min-h-[160px] relative overflow-hidden">
          <div>
            <p className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-[#16A34A] uppercase tracking-[0.1em] mb-1 sm:mb-2">
              FIRST-YEAR RETENTION
              <DisclaimerTooltip
                text={DATA_SOURCE_DISCLAIMERS.collegeScorecard}
              />
            </p>
            <p
              data-testid="retention-value"
              className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mb-2 sm:mb-4"
            >
              {retention === null
                ? formatPercentOrNotPublished(null)
                : formatPercentOrNotPublished(retention * animProgress)}
            </p>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full mt-1 sm:mt-2">
            {retention !== null && (
              <div
                className="bg-[#2563EB] h-2 rounded-full"
                style={{ width: `${retention * animProgress}%` }}
              />
            )}
          </div>
        </div>

        {/* 20-Year ROI */}
        <div className="bg-[#FDF4FF] border border-[#F5D0FE]/60 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm flex flex-col justify-between min-h-[130px] sm:min-h-[160px] relative overflow-hidden">
          <div>
            <p className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-[#C084FC] uppercase tracking-[0.1em] mb-1 sm:mb-2">
              20-YEAR NET ROI
              <DisclaimerTooltip
                text={DATA_SOURCE_DISCLAIMERS.lehdCalculated}
              />
            </p>
            <p className="text-2xl sm:text-4xl md:text-5xl font-black text-[#2563EB] tracking-tighter mb-1">
              {formatRoi(netRoi20Yr || null)}
            </p>
            {/* <p className="text-[10px] sm:text-xs text-gray-400 font-medium">
              Lifetime premium
            </p> */}
          </div>
        </div>
      </div>

      {/* 3. Salary Trajectory Line Graph */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Salary Trajectory
        </h2>
        <div className="bg-white border border-gray-150 rounded-3xl p-6.5 shadow-sm">
          {hasSalaryData ? (
            <>
              <SalaryTrajectoryChart
                year1={s1}
                year5={s5}
                year10={s10}
                animProgress={animProgress}
                gradientId={chartGradientId}
                clipId={chartClipId}
                formatCurrency={formatCurrency}
              />

              <div className="flex justify-center items-center gap-2 mt-4">
                <span className="w-2.5 h-2.5 bg-[#3B82F6] rounded-full" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  Reported earnings
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                className="w-12 h-12 text-gray-300 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28m0 0a3 3 0 10-3-3M3.75 21h16.5"
                />
              </svg>
              <p className="text-sm font-semibold text-gray-500">
                Salary trajectory data is not available for this program
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Estimates will populate once federal scorecard updates are
                released.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Debt-to-Income Ratio */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Debt-to-Income Ratio
        </h2>
        <div className="bg-white border border-gray-150 rounded-3xl p-8 shadow-sm flex flex-col gap-6">
          {/* No value judgement on the ratio ("good value" etc.): there is no
              agreed threshold, and the PDF report states the ratio without
              one. Show the figure; the reader judges. */}
          <div className="flex justify-between items-center">
            <span
              data-testid="debt-ratio-value"
              className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-auto"
            >
              {debtRatio !== null
                ? `${debtRatio.toFixed(2)} : 1 debt per $1 of earnings`
                : NOT_PUBLISHED}
            </span>
          </div>

          {/* Ratio bar: only drawn from a real ratio */}
          {debtRatio !== null && (
            <div
              data-testid="debt-ratio-bar"
              className="w-full h-8 rounded-xl overflow-hidden flex font-bold text-[10px] text-white"
            >
              <div
                className="bg-[#EF4444] flex items-center justify-center"
                style={{ width: `${debtRatio * 100 * animProgress}%` }}
              >
                Debt
              </div>
              <div className="bg-[#2563EB] flex items-center justify-center flex-1">
                Income
              </div>
            </div>
          )}

          <div className="flex justify-between items-center px-1">
            <div className="flex flex-col">
              <span
                data-testid="avg-debt-value"
                className="text-sm font-black text-gray-900"
              >
                {avgDebt !== null
                  ? formatCurrency(avgDebt * animProgress)
                  : NOT_PUBLISHED}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Typical debt (school)
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span
                data-testid="early-earnings-value"
                className="text-sm font-black text-gray-900"
              >
                {earlyEarnings !== null
                  ? formatCurrency(earlyEarnings * animProgress)
                  : NOT_PUBLISHED}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {debtRatioBasisLabel
                  ? `School median earnings, ${debtRatioBasisLabel}`
                  : "School median earnings"}
              </span>
            </div>
          </div>

          {debtRatioDefinition && (
            <p
              data-testid="debt-ratio-definition"
              className="text-xs text-gray-500 font-medium border-t border-gray-50 pt-4 leading-relaxed"
            >
              {debtRatioDefinition}
            </p>
          )}
        </div>
      </div>

      {/* 5. Earnings Figures Disclaimer */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6 flex gap-3">
        <Info size={18} className="shrink-0 text-slate-400 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-1">
            About These Earnings Figures
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Earnings data comes from the U.S. Department of Education&apos;s
            College Scorecard and U.S. Census Bureau&apos;s LEHD. Where official
            figures aren&apos;t available for a specific program, we provide a
            statistical estimate based on related data points, clearly marked
            as &quot;Estimated&quot; or &quot;Rough Estimate.&quot; Figures
            marked &quot;Reported&quot; reflect actual reported outcomes.
            These numbers are historical and may not reflect current earnings
            for recent graduates.
          </p>
        </div>
      </div>
    </div>
  );
}
