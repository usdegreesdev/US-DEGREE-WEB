"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import { Info } from "lucide-react";
import { OutcomesSectionProps } from "@/types/university/OutcomesSection";
import DisclaimerTooltip from "@/components/common/DisclaimerTooltip";
import EarningsMethodBadge from "@/components/common/EarningsMethodBadge";
import { DATA_SOURCE_DISCLAIMERS } from "@/constants/dataSourceDisclaimers";
import { EARNINGS_SKIPPED_METHODS } from "@/types/earningsMethod";
import { formatPercentOrNotPublished } from "@/lib/university/outcomeFormat";

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
  loanPrincipal,
  avgSalary,
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

  const parseNumber = (val: number | string | null | undefined): number => {
    if (val === null || val === undefined) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
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

  // 3. Debt to Income calculations
  const rawRatio = parseNumber(debtIncomeRatio) || 0.4;
  // Multiplier is 1 / ratio, e.g. 1 / 0.4 = 2.5
  const multiplier = rawRatio > 0 ? (1 / rawRatio).toFixed(1) : "2.5";

  // Early-career salary (avgSalary from DB, or fallback to s1/1st year earnings, fallback to $45k if very low)
  const earlyEarnings =
    avgSalary !== undefined && avgSalary !== null && parseNumber(avgSalary) > 0
      ? parseNumber(avgSalary)
      : s1 != null && s1 > 20000
        ? s1
        : null;
  // Average debt = loanPrincipal from aid table (or fallback to earlyEarnings * rawRatio)
  const avgDebt =
    loanPrincipal !== undefined &&
    loanPrincipal !== null &&
    parseNumber(loanPrincipal) > 0
      ? parseNumber(loanPrincipal)
      : earlyEarnings !== null
        ? Math.round(earlyEarnings * rawRatio)
        : null;

  // 4. Projected Salary Trajectory SVG Calculations
  const hasSalaryData = s1 !== null || s5 !== null || s10 !== null;

  const s1Val =
    s1 ?? (s5 ? Math.round(s5 / 1.3) : s10 ? Math.round(s10 / 1.6) : 40000);
  const s5Val = s5 ?? Math.round(s1Val * 1.3);
  const s10Val = s10 ?? Math.round(s5Val * 1.25);
  const s15Val = Math.round(s10Val * 1.25);
  const s20Val = Math.round(s10Val * 1.5);

  const trajectoryPoints = [
    { label: "ENTRY", val: s1Val },
    { label: "YEAR 5", val: s5Val },
    { label: "YEAR 10", val: s10Val },
    { label: "YEAR 15", val: s15Val },
    { label: "YEAR 20", val: s20Val },
  ];

  // SVG dimensions
  const width = 600;
  const height = 220;
  const paddingLeft = 60;
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 30;

  const maxVal = s20Val * 1.1;
  const minVal = s1Val * 0.8;
  const diffVal = maxVal - minVal;
  const safeDiff = diffVal === 0 ? 1 : diffVal;

  const baselineY = height - paddingBottom;

  // Map values to coordinates, scaled by animProgress
  const coords = trajectoryPoints.map((pt, i) => {
    const x =
      paddingLeft +
      (i * (width - paddingLeft - paddingRight)) /
        (trajectoryPoints.length - 1);
    const targetY =
      height -
      paddingBottom -
      ((pt.val - minVal) * (height - paddingTop - paddingBottom)) / safeDiff;
    const y = baselineY + (targetY - baselineY) * animProgress;
    return { x, y };
  });

  // Build SVG path using cubic bezier for smooth curves
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const cpX1 = curr.x + (next.x - curr.x) / 3;
    const cpY1 = curr.y;
    const cpX2 = curr.x + (2 * (next.x - curr.x)) / 3;
    const cpY2 = next.y;
    pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
  }

  // Path for gradient fill underneath
  const fillD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingBottom} L ${coords[0].x} ${height - paddingBottom} Z`;

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
            <p className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mb-2 sm:mb-4">
              {retention === null
                ? formatPercentOrNotPublished(null)
                : formatPercentOrNotPublished(retention * animProgress)}
            </p>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full mt-1 sm:mt-2">
            <div
              className="bg-[#2563EB] h-2 rounded-full"
              style={{
                width: `${(retention ?? 0) * animProgress}%`,
              }}
            />
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
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full min-w-[500px] h-auto overflow-visible"
                >
                  <defs>
                    <linearGradient
                      id={chartGradientId}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                      <stop
                        offset="100%"
                        stopColor="#3B82F6"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                    <clipPath id={chartClipId}>
                      <rect
                        x="0"
                        y="0"
                        width={width * animProgress}
                        height={height}
                      />
                    </clipPath>
                  </defs>

                  {/* Y Axis Grid Lines & Labels */}
                  {[minVal, (minVal + maxVal) / 2, maxVal].map((yVal, i) => {
                    const y =
                      height -
                      paddingBottom -
                      ((yVal - minVal) *
                        (height - paddingTop - paddingBottom)) /
                        safeDiff;
                    return (
                      <g key={i}>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={width - paddingRight}
                          y2={y}
                          stroke="#F3F4F6"
                          strokeWidth="1.5"
                        />
                        <text
                          x={paddingLeft - 10}
                          y={y + 4}
                          textAnchor="end"
                          className="text-[10px] font-black text-gray-400"
                        >
                          {formatCurrency(yVal)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Curve Area Fill */}
                  <path
                    d={fillD}
                    fill={`url(#${chartGradientId})`}
                    clipPath={`url(#${chartClipId})`}
                  />

                  {/* Curve Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    clipPath={`url(#${chartClipId})`}
                  />

                  {/* Data points */}
                  {coords.map((coord, i) => {
                    const dotVisible = width * animProgress >= coord.x;
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
                      y={height - paddingBottom + 18}
                      textAnchor="middle"
                      className="text-[9px] font-black fill-gray-400 uppercase tracking-wider"
                    >
                      {trajectoryPoints[i].label}
                    </text>
                  ))}
                </svg>
              </div>

              <div className="flex justify-center items-center gap-2 mt-4">
                <span className="w-2.5 h-2.5 bg-[#3B82F6] rounded-full" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  Projected Growth
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
          <div className="flex justify-between items-center">
            <span className="px-3 py-1.5 bg-[#E0F2FE] text-[#0369A1] rounded-full text-[9px] font-extrabold uppercase tracking-wider">
              {Number(multiplier) >= 2.0 ? "HIGH ROI POTENTIAL" : "GOOD VALUE"}
            </span>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              1:{(Number(multiplier) * animProgress).toFixed(1)} Debt-to-income
            </span>
          </div>

          {/* Dynamic ratio bar */}
          <div className="w-full h-8 rounded-xl overflow-hidden flex font-bold text-[10px] text-white">
            <div
              className="bg-[#EF4444] flex items-center justify-center"
              style={{ width: `${rawRatio * 100 * animProgress}%` }}
            >
              Debt
            </div>
            <div className="bg-[#2563EB] flex items-center justify-center flex-1">
              Income
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <div className="flex flex-col">
              <span className="text-sm font-black text-gray-900">
                {avgDebt !== null
                  ? formatCurrency(avgDebt * animProgress)
                  : "N/A"}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Average debt
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-sm font-black text-gray-900">
                {earlyEarnings !== null
                  ? formatCurrency(earlyEarnings * animProgress)
                  : "N/A"}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Average early-career earnings
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center font-medium border-t border-gray-50 pt-4">
            Students typically earn ~
            {(Number(multiplier) * animProgress).toFixed(1)}x their debt after
            graduation
          </p>
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
