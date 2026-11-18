"use client";

import React, { useEffect, useRef, useState } from "react";
import { AdmissionsOverviewProps } from "@/types/university/AdmissionsOverview";
import DisclaimerTooltip from "@/components/common/DisclaimerTooltip";
import EarningsMethodBadge from "@/components/common/EarningsMethodBadge";
import { DATA_SOURCE_DISCLAIMERS } from "@/constants/dataSourceDisclaimers";
import { toPercent } from "@/lib/fieldScale";
import { NOT_PUBLISHED } from "@/lib/notPublished";
import { firstReal } from "@/lib/firstReal";

// "1,234" → 1234; "Not published" / "" / "N/A" → null (never 0).
const parseDisplayNumber = (value: string): number | null => {
  const digits = value.replace(/[^0-9.]/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
};

// null / non-finite → Not published; a real 0 renders "0".
const formatDisplayNumber = (value: number | null): string => {
  if (value === null || !Number.isFinite(value) || value < 0) return NOT_PUBLISHED;
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const formatCurrency = (
  value: number | string | null | undefined,
  compact = false,
): string => {
  if (value === null || value === undefined) return "N/A";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (compact && n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (compact && n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  const parts = Math.round(n).toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "$" + parts[0];
};

// earnings.growth_rate is already a percent and may be negative (−30 → "-30%");
// its scale is declared in lib/fieldScale, never guessed from magnitude.
const formatPercent = (value: number | string | null | undefined): string => {
  const pct = toPercent("earnings.growth_rate", value);
  return pct === null
    ? NOT_PUBLISHED
    : `${pct.toFixed(1).replace(/\.0$/, "")}%`;
};

const SAT_MIN = 200;
const SAT_MAX = 800;

type SatRange = {
  low: number;
  high: number;
  leftPct: number;
  widthPct: number;
} | null;

// Parses strings like "420 - 530". Returns null for missing/invalid values so
// no misleading empty range is rendered.
const parseSatRange = (value: string | null | undefined): SatRange => {
  if (!value) return null;
  const nums = value.match(/\d+/g)?.map(Number);
  if (!nums || nums.length < 2) return null;
  const [a, b] = nums;
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  if (low < SAT_MIN || high > SAT_MAX) return null;
  const span = SAT_MAX - SAT_MIN;
  return {
    low,
    high,
    leftPct: ((low - SAT_MIN) / span) * 100,
    widthPct: Math.max(((high - low) / span) * 100, 1),
  };
};

export default function AdmissionsOverview({
  admissionRate,
  applicants,
  satReadingWriting,
  satMath,
  onViewAdmissions,
  salaryYear1,
  salaryYear10,
  salaryYear1Method,
  salaryYear10Method,
  netRoi20Yr,
  growthRate,
}: AdmissionsOverviewProps) {
  const admissionRateValue = parseFloat(admissionRate);
  const parsedRate = Number.isFinite(admissionRateValue) ? admissionRateValue : null;
  const acceptedApplicants = parseDisplayNumber(applicants);
  // Estimated applicants need a real, non-zero admit rate and a real count.
  const estimatedTotal =
    parsedRate !== null && parsedRate !== 0 && acceptedApplicants !== null
      ? acceptedApplicants / (parsedRate / 100)
      : null;

  // Ring fill (a UI geometry value): an unknown rate draws an empty ring.
  const percentage =
    parsedRate !== null ? Math.min(Math.max(parsedRate, 0), 100) : 0;
  const strokeWidth = 14;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  const effectiveSalaryYear1 = salaryYear1;
  const effectiveSalaryYear10 = salaryYear10;
  const effectiveNetRoi = netRoi20Yr;
  const effectiveGrowthRate = growthRate;

  // A real 0% rate is a value; only a missing rate gets the neutral label.
  const competitiveness =
    parsedRate !== null
      ? parsedRate < 10
        ? "Highly Competitive"
        : parsedRate < 30
          ? "Selective"
          : parsedRate < 70
            ? "Moderately Selective"
            : "Open Admission"
      : "Admission Rate";

  // ── Animation state ──
  const cardRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [animatedOffset, setAnimatedOffset] = useState(circumference);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          // Animate the stroke offset via CSS transition (handled inline)
          setAnimatedOffset(circumference - (percentage / 100) * circumference);

          // Count-up the percentage number
          const duration = 1200; // ms
          const steps = 60;
          const stepTime = duration / steps;
          let current = 0;
          const increment = percentage / steps;
          const timer = setInterval(() => {
            current += increment;
            if (current >= percentage) {
              current = percentage;
              clearInterval(timer);
            }
            setAnimatedPercent(parseFloat(current.toFixed(1)));
          }, stepTime);
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated, percentage, circumference]);

  // ── SAT percentile ranges (25th–75th) on the 200–800 scale ──
  const satRows = [
    {
      label: "SAT Evidence-Based Reading & Writing",
      range: parseSatRange(satReadingWriting),
    },
    { label: "SAT Math", range: parseSatRange(satMath) },
  ].filter(
    (r): r is { label: string; range: NonNullable<SatRange> } => r.range !== null,
  );

  // ── Outcomes card count-up animation ──
  const outcomesRef = useRef<HTMLDivElement>(null);
  const [outcomesAnimated, setOutcomesAnimated] = useState(false);
  // Before the count-up runs (or if the card never scrolls into view) the
  // real figure is shown — never a placeholder "$0" / "0%".
  const [animSalary10, setAnimSalary10] = useState(() =>
    formatCurrency(salaryYear10),
  );
  const [animSalary1, setAnimSalary1] = useState(() =>
    formatCurrency(salaryYear1),
  );
  const [animRoi, setAnimRoi] = useState(() => formatCurrency(netRoi20Yr, true));
  const [animGrowth, setAnimGrowth] = useState(() => formatPercent(growthRate));

  useEffect(() => {
    const el = outcomesRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !outcomesAnimated) {
          setOutcomesAnimated(true);

          // Animation targets: real values only (null → no count-up).
          const sal10Target = firstReal(effectiveSalaryYear10);
          const sal1Target = firstReal(effectiveSalaryYear1);
          const roiTarget = firstReal(effectiveNetRoi);
          const growthTarget = firstReal(effectiveGrowthRate);

          const duration = 1200;
          const steps = 60;
          const stepTime = duration / steps;
          let step = 0;

          const timer = setInterval(() => {
            step++;
            const progress = Math.min(step / steps, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            if (sal10Target !== null && sal10Target > 0)
              setAnimSalary10(formatCurrency(eased * sal10Target));
            if (sal1Target !== null && sal1Target > 0)
              setAnimSalary1(formatCurrency(eased * sal1Target));
            if (roiTarget !== null && roiTarget > 0)
              setAnimRoi(formatCurrency(eased * roiTarget, true));
            if (growthTarget !== null && growthTarget > 0)
              setAnimGrowth(formatPercent(eased * growthTarget));

            if (step >= steps) {
              clearInterval(timer);
              setAnimSalary10(formatCurrency(effectiveSalaryYear10));
              setAnimSalary1(formatCurrency(effectiveSalaryYear1));
              setAnimRoi(formatCurrency(effectiveNetRoi, true));
              setAnimGrowth(formatPercent(effectiveGrowthRate));
            }
          }, stepTime);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [
    outcomesAnimated,
    effectiveSalaryYear10,
    effectiveSalaryYear1,
    effectiveNetRoi,
    effectiveGrowthRate,
  ]);

  return (
    <div className="mb-10 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-2xl font-bold text-slate-900 font-lexend  border-slate-900 pb-1 leading-none">
          Admissions Overview
        </h2>
      </div>

      {/* Acceptance Rate + SAT percentile ranges */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center lg:gap-6">

        {/* Left — Animated circular progress card */}
        <div
          ref={cardRef}
          className="flex flex-col items-center justify-center gap-5 py-10 px-4 lg:px-8"
          style={{ background: "#F8FAFC", borderRadius: 20 }}
        >
          <div
            style={{ width: 170, height: 170 }}
            className="relative flex items-center justify-center"
          >
            <svg
              width="170"
              height="170"
              viewBox="0 0 170 170"
              className="w-full h-full"
            >
              <circle
                cx="85"
                cy="85"
                r={radius}
                fill="white"
                stroke="#CBD5E1"
                strokeWidth={strokeWidth}
              />
              <circle
                cx="85"
                cy="85"
                r={radius}
                fill="none"
                stroke="#2054FE"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={animatedOffset}
                strokeLinecap="round"
                transform="rotate(-90 85 85)"
                style={{
                  transition:
                    "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-black font-lexend text-slate-900 pb-0.5 leading-none">
                {hasAnimated && animatedPercent < percentage
                  ? `${animatedPercent.toFixed(1)}%`
                  : admissionRate}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-semibold text-slate-500 font-lexend">
              Acceptance Rate
            </p>
            {parsedRate !== null && (
              <span className="rounded-full bg-[#2054FE]/10 px-3 py-1 text-sm font-bold font-lexend text-[#2054FE]">
                {competitiveness}
              </span>
            )}
          </div>
        </div>

        {/* Right — SAT middle-50% range indicators */}
        <div className="flex flex-col gap-6 justify-center">
          {satRows.length > 0 && (
            <>
              {satRows.map((row) => (
                <div key={row.label} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-sm font-bold text-slate-900 font-lexend">
                      {row.label}
                    </span>
                    <span className="text-sm font-bold text-slate-900 font-lexend whitespace-nowrap">
                      {row.range.low} – {row.range.high}
                    </span>
                  </div>
                  <div
                    className="relative h-3 rounded-full bg-[#E2E8F0]"
                    role="img"
                    aria-label={`${row.label}: ${row.range.low} to ${row.range.high} on a ${SAT_MIN} to ${SAT_MAX} scale`}
                  >
                    <div
                      className="absolute top-0 h-full rounded-full bg-[#2054FE]"
                      style={{
                        left: `${row.range.leftPct}%`,
                        width: hasAnimated ? `${row.range.widthPct}%` : "0%",
                        transition:
                          "width 1s cubic-bezier(0.4, 0, 0.2, 1) 0.3s",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-400 font-lexend">
                    <span>{SAT_MIN}</span>
                    <span>{SAT_MAX}</span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500">
                SAT ranges represent the middle 50% (25th–75th percentile).
              </p>
            </>
          )}
          {onViewAdmissions && (
            <button
              type="button"
              onClick={onViewAdmissions}
              className="self-start text-sm font-semibold text-[#2563EB] hover:underline font-lexend"
            >
              View admission details →
            </button>
          )}
        </div>
      </div>

      {estimatedTotal !== null && acceptedApplicants !== null && (
        <p className="text-sm font-semibold text-slate-700">
          Estimated {formatDisplayNumber(estimatedTotal)} applicants, with{" "}
          {formatDisplayNumber(acceptedApplicants)} accepted.
        </p>
      )}

      {/* Outcomes card — animated count-up */}
      <div
        ref={outcomesRef}
        className="bg-white w-full p-6"
        style={{
          borderRadius: 20,
          boxShadow: "0px 2px 3px rgba(0,0,0,0.05)",
          outline: "3px #F1F5F9 solid",
          outlineOffset: "-3px",
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Salary 10th Year */}
          <div
            className="bg-white flex flex-col justify-between p-5"
            style={{
              borderRadius: 10,
              outline: "1.25px #E2E8F0 solid",
              minHeight: 120,
            }}
          >
            <p
              className="text-3xl font-black leading-none font-lexend"
              style={{ color: "#0AC69D" }}
            >
              {animSalary10}+
            </p>
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-lexend mt-3">
              Median Salary in 10
              <span className="align-super text-[7px]">th</span> Year
              <DisclaimerTooltip text={DATA_SOURCE_DISCLAIMERS.ipeds} />
              {salaryYear10Method && (
                <EarningsMethodBadge method={salaryYear10Method} />
              )}
            </p>
          </div>

          {/* Salary 1st Year */}
          <div
            className="bg-white flex flex-col justify-between p-5"
            style={{
              borderRadius: 10,
              outline: "1.25px #E2E8F0 solid",
              minHeight: 120,
            }}
          >
            <p
              className="text-3xl font-black leading-none font-lexend"
              style={{ color: "#45A0D0" }}
            >
              {animSalary1}
            </p>
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-poppins mt-3">
              Median Salary in 1
              <span className="align-super text-[7px]">st</span> Year
              <DisclaimerTooltip text={DATA_SOURCE_DISCLAIMERS.ipeds} />
              {salaryYear1Method && (
                <EarningsMethodBadge method={salaryYear1Method} />
              )}
            </p>
          </div>

          {/* 20-Year Net ROI */}
          <div
            className="bg-white flex flex-col justify-between p-5"
            style={{
              borderRadius: 10,
              outline: "1.25px #E2E8F0 solid",
              minHeight: 130,
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-poppins mb-2">
              20-Year Net ROI
            </p>
            <p
              className="text-3xl font-black leading-none font-poppins"
              style={{ color: "#AB61FF" }}
            >
              {animRoi}
            </p>
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-poppins mt-3">
              Lifetime Earnings Premium
              <DisclaimerTooltip
                text={DATA_SOURCE_DISCLAIMERS.lehdCalculated}
              />
            </p>
          </div>

          {/* Growth Rate */}
          <div
            className="bg-white flex flex-col justify-between p-5"
            style={{
              borderRadius: 10,
              outline: "1.25px #E2E8F0 solid",
              minHeight: 130,
            }}
          >
            <p
              className="text-3xl font-black leading-none font-poppins"
              style={{ color: "#F75659" }}
            >
              {animGrowth}
            </p>
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-poppins mt-3">
              Growth Rate
              <DisclaimerTooltip
                text={DATA_SOURCE_DISCLAIMERS.lehdCalculated}
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
