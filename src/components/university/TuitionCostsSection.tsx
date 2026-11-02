"use client";

import React, { useEffect, useRef, useState } from "react";
import { Tooltip } from "antd";
import { GraduationCap, HandCoins, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { TuitionCostsSectionProps } from "@/types/university/TuitionCostsSection";
import DisclaimerTooltip from "@/components/common/DisclaimerTooltip";
import { DATA_SOURCE_DISCLAIMERS } from "@/constants/dataSourceDisclaimers";

const fmt = (val: number | null | undefined): string => {
  if (val == null || !Number.isFinite(val)) return "N/A";
  return (
    "$" +
    Math.round(val)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  );
};

// Sum that returns null if any operand is missing, so totals don't silently
// treat a missing value as 0.
const sumOrNull = (...vals: (number | null | undefined)[]): number | null =>
  vals.some((v) => v == null)
    ? null
    : vals.reduce((a: number, b) => a + (b as number), 0);

const getLoanMessage = (pct: number): string => {
  if (pct <= 19)
    return "Relatively few students rely on loans to help finance their education";
  if (pct <= 39)
    return "Some students use loans as part of their education funding strategy.";
  if (pct <= 59)
    return "Student loans are a common source of funding for many students.";
  if (pct <= 79)
    return "A large share of students rely on loans to support their educational costs.";
  return "Student loans play a major role in helping most students finance their education.";
};

// ── Income brackets ──────────────────────────────────────────────────────────

type BracketId =
  | "0-30000"
  | "30001-48000"
  | "48001-75000"
  | "75001-110000"
  | "110001+";

// Single source of truth for the bracket label, the upper income bound that
// selects it (null = open-ended) and the midpoint used when it is clicked.
const INCOME_BRACKETS: ReadonlyArray<{
  id: BracketId;
  label: string;
  max: number | null;
  midpoint: number;
}> = [
  { id: "0-30000", label: "$0 – $30,000", max: 30000, midpoint: 15000 },
  {
    id: "30001-48000",
    label: "$30,001 – $48,000",
    max: 48000,
    midpoint: 39000,
  },
  {
    id: "48001-75000",
    label: "$48,001 – $75,000",
    max: 75000,
    midpoint: 61500,
  },
  {
    id: "75001-110000",
    label: "$75,001 – $110,000",
    max: 110000,
    midpoint: 92500,
  },
  { id: "110001+", label: "$110,001+", max: null, midpoint: 130000 },
];

const MAX_INCOME = 150000;

const bracketForIncome = (income: number): BracketId =>
  (
    INCOME_BRACKETS.find((b) => b.max == null || income <= b.max) as {
      id: BracketId;
    }
  ).id;

// ── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Runs a one-shot easeOutCubic 0→1 animation the first time `ref` scrolls into
 * view. Returns the current eased progress.
 */
function useScrollCountUp(ref: React.RefObject<HTMLElement | null>): number {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
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
            const t = Math.min(step / steps, 1);
            setProgress(1 - Math.pow(1 - t, 3));

            if (step >= steps) {
              clearInterval(timer);
              setProgress(1);
            }
          }, stepTime);
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, hasAnimated]);

  return progress;
}

// ── Presentational pieces ────────────────────────────────────────────────────

function AidStatCard({
  percent,
  label,
  description,
  progress,
}: {
  percent: number | null;
  label: string;
  description: string;
  progress: number;
}) {
  return (
    <div className="bg-[#ECFDF5] rounded-xl border border-[#E2E8F0] p-4 sm:p-6 flex flex-col gap-2 sm:gap-3">
      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0ACC4E] font-poppins">
        {percent != null ? `${Math.round(percent * progress)}%` : "N/A"}
      </p>
      <p className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 tracking-wider font-poppins">
        {label}
        <DisclaimerTooltip text={DATA_SOURCE_DISCLAIMERS.collegeScorecard} />
      </p>
      <p className="text-[10px] sm:text-xs text-slate-500 font-poppins leading-normal sm:leading-relaxed">
        {description}
      </p>
      <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden mt-auto">
        <div
          className="h-full bg-[#0ACC4E] rounded-full"
          style={{ width: `${(percent ?? 0) * progress}%` }}
        />
      </div>
    </div>
  );
}

function SummaryOperator({ symbol }: { symbol: string }) {
  return (
    <span
      aria-hidden="true"
      className="hidden md:flex items-center text-xl font-bold text-slate-400"
    >
      {symbol}
    </span>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  note,
  value,
  tileClass,
  iconClass,
  valueClass,
  iconSize = "w-6 h-6",
}: {
  icon: LucideIcon;
  label: string;
  note?: string;
  value: number | null;
  tileClass: string;
  iconClass: string;
  valueClass: string;
  iconSize?: string;
}) {
  return (
    <div
      className={`rounded-xl flex items-center gap-3 ${tileClass}`}
      style={{ outline: "1.22px #E2E8F0 solid" }}
    >
      <Icon
        aria-hidden="true"
        className={`${iconSize} shrink-0 ${iconClass}`}
      />
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-[10px] sm:text-xs font-bold text-black font-poppins">
          {label}
          {note && (
            <>
              {" "}
              <span className="font-medium text-slate-600">{note}</span>
            </>
          )}
        </p>
        <p className={`font-poppins ${valueClass}`}>
          {fmt(value)}
          <span className="text-[10px] sm:text-xs font-bold"> / yr</span>
        </p>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TuitionCostsSection({
  tuitionData,
  tuitionType: propTuitionType,
}: TuitionCostsSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animProgress = useScrollCountUp(containerRef);

  const tuitionInState = tuitionData?.tuition?.tuition_in_state ?? null;
  const tuitionOutState = tuitionData?.tuition?.tuition_out_state ?? null;
  const bookSupply = tuitionData?.tuition?.booksupply ?? null;
  const roomBoardOnCampus = tuitionData?.housing?.roomboard_oncampus ?? null;
  const roomBoardOffCampus = tuitionData?.housing?.roomboard_offcampus ?? null;
  const otherExpenseOnCampus =
    tuitionData?.expenses?.otherexpense_oncampus ?? null;
  const otherExpenseOffCampus =
    tuitionData?.expenses?.otherexpense_offcampus ?? null;
  const otherExpenseWithFamily =
    tuitionData?.expenses?.otherexpense_withfamily ?? null;
  const stickerPriceByApi = tuitionData?.tuition?.sticker_price_by_api ?? null;
  const stickerPriceYear = tuitionData?.tuition?.sticker_price_year ?? null;
  const aidPercentage = tuitionData?.financial_aid?.aid_percentage ?? null;
  const studentsWithLoan =
    tuitionData?.financial_aid?.students_with_any_loan != null
      ? Math.round(tuitionData.financial_aid.students_with_any_loan * 100)
      : null;
  const loanMessage =
    studentsWithLoan != null ? getLoanMessage(studentsWithLoan) : "N/A";

  const netPrices: Record<BracketId, number | null> = {
    "0-30000": tuitionData?.net_price?.income_0_30000 ?? null,
    "30001-48000": tuitionData?.net_price?.income_30001_48000 ?? null,
    "48001-75000": tuitionData?.net_price?.income_48001_75000 ?? null,
    "75001-110000": tuitionData?.net_price?.income_75001_110000 ?? null,
    "110001+": tuitionData?.net_price?.income_110001_plus ?? null,
  };

  // No in/out-state toggle is wired in this view, so the type is driven purely
  // by the parent (falling back to in-state when rendered standalone).
  const tuitionType = propTuitionType ?? "in_state";

  const activeTuition =
    tuitionType === "in_state" ? tuitionInState : tuitionOutState;
  const activeStickerPrice = sumOrNull(
    bookSupply,
    activeTuition,
    roomBoardOnCampus,
    otherExpenseOnCampus,
  );

  const [sliderValue, setSliderValue] = useState(23144);
  const [incomeRange, setIncomeRange] = useState<BracketId>("0-30000");
  const [inputVal, setInputVal] = useState("23,144");

  const handleSliderChange = (val: number) => {
    setSliderValue(val);
    setInputVal(val.toLocaleString());
    setIncomeRange(bracketForIncome(val));
  };

  const handleBracketClick = (range: BracketId) => {
    const bracket = INCOME_BRACKETS.find((b) => b.id === range);
    setIncomeRange(range);
    if (!bracket) return;
    setSliderValue(bracket.midpoint);
    setInputVal(bracket.midpoint.toLocaleString());
  };

  const handleIncomeInputChange = (rawText: string) => {
    setInputVal(rawText);

    const numeric = rawText.replace(/[^0-9]/g, "");
    if (numeric) {
      const clamped = Math.min(MAX_INCOME, Math.max(0, parseInt(numeric, 10)));
      setSliderValue(clamped);
      setIncomeRange(bracketForIncome(clamped));
    } else {
      setSliderValue(0);
      setIncomeRange("0-30000");
    }
  };

  const currentNetPrice = netPrices[incomeRange];
  const currentFinAid =
    activeStickerPrice != null && currentNetPrice != null
      ? Math.max(0, activeStickerPrice - currentNetPrice)
      : null;

  const costCards = [
    { label: "Tuition In State", value: activeTuition, bg: "#F5F3FF" },
    { label: "Tuition Out State", value: tuitionOutState, bg: "#C6D4FF" },
    { label: "Book & Supply", value: bookSupply, bg: "#FEDDDD" },
    {
      label: "Room & Board On Campus",
      value: roomBoardOnCampus,
      bg: "#C6FFF2",
    },
    {
      label: "Room & Board Off Campus",
      value: roomBoardOffCampus,
      bg: "#EFC8FF",
    },
    {
      label: "Other Expenses On Campus",
      value: otherExpenseOnCampus,
      bg: "#FFEDB2",
    },
    {
      label: "Other Expenses Off Campus",
      value: otherExpenseOffCampus,
      bg: "#FFD0C0",
    },
    {
      label: "Other Expenses With Family",
      value: otherExpenseWithFamily,
      bg: "#CEFFD0",
    },
    {
      label: "Average Annual Cost of Attendance",
      value: stickerPriceByApi,
      bg: "#CEFFD0",
      note:
        stickerPriceByApi != null && stickerPriceYear
          ? `as in ${stickerPriceYear}`
          : null,
      disclaimer:
        "Estimated annual cost before financial aid — tuition, fees, books, housing, and living expenses combined. Not a personalized quote. Source: College Scorecard (U.S. Dept. of Education).",
    },
  ];

  const breakdownRows = [
    { label: "Books & supplies", value: bookSupply, bold: false },
    { label: "In-state tuition fees", value: activeTuition, bold: false },
    {
      label: "Room & board On-Campus",
      value: roomBoardOnCampus,
      bold: false,
    },
    {
      label: "Other on-campus expenses",
      value: otherExpenseOnCampus,
      bold: false,
    },
    {
      label: "In-State On-Campus sticker price",
      value: activeStickerPrice,
      bold: true,
    },
  ];

  return (
    <div ref={containerRef} className="flex flex-col gap-8 py-6 max-w-4xl">
      {/* ── 1. Cost of Attendance ── */}
      <div>
        <h2 className="flex items-center gap-1.5 text-2xl font-bold text-black font-poppins mb-4">
          Cost of Attendance
          <DisclaimerTooltip text={DATA_SOURCE_DISCLAIMERS.collegeScorecard} />
        </h2>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {costCards.map((card) => (
            <div
              key={card.label}
              className="relative rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[80px] sm:min-h-[90px]"
              style={{ background: card.bg, outline: "1.27px #E2E8F0 solid" }}
            >
              {card.disclaimer && (
                <Tooltip title={card.disclaimer}>
                  <QuestionCircleOutlined className="absolute top-2 right-2 text-slate-500 hover:text-slate-700 cursor-help text-xs sm:text-sm" />
                </Tooltip>
              )}
              <p className="text-[9px] sm:text-[10px] font-bold text-black font-poppins pr-4">
                {card.label}
              </p>
              <p className="text-sm sm:text-base md:text-xl font-bold font-poppins text-black">
                {fmt(card.value)}
              </p>
              {card.note && (
                <p className="text-[9px] sm:text-[10px] font-medium text-slate-600 font-poppins">
                  {card.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Financial Aid Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <AidStatCard
          percent={aidPercentage}
          label="Receive Financial Aid"
          description="Students receive need-based grants to ease the cost of education. Financial aid programs help lower overall tuition expenses and make college more accessible."
          progress={animProgress}
        />
        <AidStatCard
          percent={studentsWithLoan}
          label="Students with any loan"
          description={loanMessage}
          progress={animProgress}
        />
      </div>

      {/* ── 3. Sticker Price Breakdown ── */}
      <div>
        <h2 className="text-2xl font-normal text-black font-poppins mb-4">
          Sticker Price Break Down
        </h2>
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          {breakdownRows.map((row, i) => (
            <div
              key={row.label}
              className={`flex justify-between items-center px-6 py-3 ${
                i < breakdownRows.length - 1 ? "border-b border-[#E2E8F0]" : ""
              }`}
            >
              <span
                className={`text-sm font-poppins ${row.bold ? "font-bold" : "font-light"} text-black`}
              >
                {row.label}
              </span>
              <span
                className={`text-sm text-[#334155] ${row.bold ? "font-extrabold" : "font-semibold"}`}
              >
                {fmt(row.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Net Price Calculator ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col gap-5">
        {/* Summary: Sticker Price − Est. Financial Aid = Net Price */}
        <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto_1fr_auto_1.25fr] md:items-stretch md:gap-2 lg:gap-3">
          <SummaryTile
            icon={Tag}
            label="Sticker Price"
            value={activeStickerPrice}
            tileClass="bg-[#FFE6C4] p-3.5 sm:p-4"
            iconClass="text-slate-700"
            valueClass="text-lg sm:text-xl font-bold text-slate-700"
          />
          <SummaryOperator symbol="−" />
          <SummaryTile
            icon={HandCoins}
            label="Est. Financial Aid"
            value={currentFinAid}
            tileClass="bg-[#C0FFF0] p-3.5 sm:p-4"
            iconClass="text-green-600"
            valueClass="text-lg sm:text-xl font-bold text-green-600"
          />
          <SummaryOperator symbol="=" />
          <SummaryTile
            icon={GraduationCap}
            label="Net Price"
            note="(Approximate)"
            value={currentNetPrice}
            tileClass="bg-[#EDE9FE] p-4 sm:p-5 border-l-4 border-purple-600 shadow-md"
            iconClass="text-purple-600"
            iconSize="w-7 h-7"
            valueClass="text-2xl sm:text-3xl font-extrabold text-purple-700"
          />
        </div>

        <p className="flex items-center gap-1.5 text-sm font-normal text-black font-poppins">
          Net price by income bracket (per year)
          <DisclaimerTooltip text={DATA_SOURCE_DISCLAIMERS.collegeScorecard} />
        </p>

        {/* Slider */}
        <div
          className="rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4"
          style={{
            background: "rgba(251,147,147,0.35)",
            boxShadow: "4px 4px 4px rgba(0,0,0,0.15)",
          }}
        >
          <div className="flex justify-between items-center md:contents gap-2">
            <span className="text-sm font-normal text-black font-poppins">
              Approximate Family income
            </span>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-3 py-1 shadow-inner w-[130px] md:w-[150px] shrink-0 md:order-last">
              <span className="text-slate-400 font-bold text-sm">$</span>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => handleIncomeInputChange(e.target.value)}
                onBlur={() => {
                  // Reformat cleanly with commas on blur
                  setInputVal(sliderValue.toLocaleString());
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setInputVal(sliderValue.toLocaleString());
                    e.currentTarget.blur();
                  }
                }}
                className="w-full text-right font-extrabold text-[#334155] text-sm focus:outline-none bg-transparent"
                placeholder="0"
              />
              <span className="text-slate-400 font-bold text-xs whitespace-nowrap">
                / Yr
              </span>
            </div>
          </div>
          <div className="flex-1 relative h-2.5 my-1 md:my-0">
            <div className="w-full h-full rounded-full bg-white overflow-hidden">
              <div
                className="h-full rounded-full bg-[#3765FE]"
                style={{ width: `${(sliderValue / MAX_INCOME) * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={MAX_INCOME}
              step={1000}
              value={sliderValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Bracket rows */}
        <div className="flex flex-col gap-2">
          {INCOME_BRACKETS.map(({ id, label }) => {
            const isActive = incomeRange === id;
            return (
              <div
                key={id}
                onClick={() => handleBracketClick(id)}
                className="flex justify-between items-center px-5 py-3 rounded-full cursor-pointer transition-all"
                style={{
                  background: isActive
                    ? "rgba(75,117,254,0.35)"
                    : "rgba(255,255,255,0.35)",
                  boxShadow: "4px 4px 4px rgba(0,0,0,0.15)",
                  outline: isActive
                    ? "none"
                    : "2px rgba(132,132,132,0.38) solid",
                }}
              >
                <span
                  className={`text-sm font-poppins ${isActive ? "font-bold" : "font-normal"} text-black`}
                >
                  {label}
                </span>
                <span className="text-sm font-extrabold text-[#334155]">
                  {fmt(netPrices[id])}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
