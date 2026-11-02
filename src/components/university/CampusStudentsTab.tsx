"use client";

import React, { useEffect, useRef, useState } from "react";
import { CampusStudentsTabProps } from "@/types/university/CampusStudentsTab";
import DisclaimerTooltip from "@/components/common/DisclaimerTooltip";
import { DATA_SOURCE_DISCLAIMERS } from "@/constants/dataSourceDisclaimers";
import { deriveCampusDemographics } from "@/lib/university/campusDemographics";

export default function CampusStudentsTab({
  campusData,
}: CampusStudentsTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Extract values, return null if missing
  const sizeCategory = campusData?.campus?.size_category || "N/A";

  const size =
    campusData?.campus?.size !== null && campusData?.campus?.size !== undefined
      ? Number(campusData.campus.size)
      : null;

  const gradStudents =
    campusData?.students?.grad_students !== null &&
    campusData?.students?.grad_students !== undefined
      ? Number(campusData.students.grad_students)
      : null;

  // Student + faculty demographics (shared with the compare details modal)
  const { menStudentsPct, womenStudentsPct, menFacultyPct, womenFacultyPct } =
    deriveCampusDemographics(campusData);

  // Repayment 3-Year Progress Rates
  const toPercentVal = (val: number | string | null | undefined) => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    if (isNaN(num)) return null;
    return num < 2 ? num * 100 : num;
  };

  const allBorrowersPct = toPercentVal(
    campusData?.repayment?.all_borrowers_3yr,
  );
  const graduatesPct = toPercentVal(campusData?.repayment?.graduates_3yr);
  const nonCompletersPct = toPercentVal(
    campusData?.repayment?.non_completers_3yr,
  );

  // Year 1 to Year 3 change table data
  const yr1 =
    campusData?.repayment?.yr1_overall !== null &&
    campusData?.repayment?.yr1_overall !== undefined
      ? Number(campusData.repayment.yr1_overall)
      : null;
  const yr3 =
    campusData?.repayment?.yr3_overall !== null &&
    campusData?.repayment?.yr3_overall !== undefined
      ? Number(campusData.repayment.yr3_overall)
      : null;
  const netChange = yr3 !== null && yr1 !== null ? yr3 - yr1 : null;

  // Completers vs Non-Completers table data
  const yr3Completers =
    campusData?.repayment?.yr3_completers !== null &&
    campusData?.repayment?.yr3_completers !== undefined
      ? Number(campusData.repayment.yr3_completers)
      : null;
  const yr3NonCompleters =
    campusData?.repayment?.yr3_noncompleters !== null &&
    campusData?.repayment?.yr3_noncompleters !== undefined
      ? Number(campusData.repayment.yr3_noncompleters)
      : null;
  const graduatesAdvantage =
    yr3Completers !== null && yr3NonCompleters !== null
      ? yr3Completers - yr3NonCompleters
      : null;

  // Income details
  const avgFamilyIncome =
    campusData?.campus?.avg_family_income !== null &&
    campusData?.campus?.avg_family_income !== undefined
      ? Number(campusData.campus.avg_family_income)
      : null;

  return (
    <div ref={containerRef} className="flex flex-col gap-10 py-4 w-full">
      {/* 1. Enrolment & Size */}
      <div>
        <h2 className="text-xl sm:text-[26px] font-black text-[#1E293B] mb-4 sm:mb-6 tracking-tight leading-none">
          Enrolment & Size
        </h2>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {/* Size Category */}
          <div className="bg-[#EBF3FF]/60 border border-[#DBEAFE]/80 rounded-2xl sm:rounded-[24px] px-4 sm:px-7 py-6 sm:py-8 flex flex-col justify-between min-h-[120px] sm:min-h-[140px] shadow-sm">
            <div>
              <p className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
                {sizeCategory}
              </p>
            </div>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mt-4">
              Size Category
            </p>
          </div>

          {/* Total Students */}
          <div className="bg-[#E6F4EA]/60 border border-[#DCFCE7]/80 rounded-2xl sm:rounded-[24px] px-4 sm:px-7 py-6 sm:py-8 flex flex-col justify-between min-h-[120px] sm:min-h-[140px] shadow-sm">
            <div>
              <p className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
                {size !== null ? size.toLocaleString() : "N/A"}
              </p>
            </div>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mt-4">
              Total Students
            </p>
          </div>

          {/* Grad Students */}
          <div className="bg-[#EBF3FF]/60 border border-[#FEF9C3]/80 rounded-2xl sm:rounded-[24px] px-4 sm:px-7 py-6 sm:py-8 flex flex-col justify-between min-h-[120px] sm:min-h-[140px] shadow-sm">
            <div>
              <p className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
                {gradStudents !== null ? gradStudents.toLocaleString() : "N/A"}
              </p>
            </div>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mt-4">
              Graduate Students
            </p>
          </div>

          {/* Average Family Income */}
          <div className="bg-[#FEFCE8]/60 border border-[#FEF9C3]/80 rounded-2xl sm:rounded-[24px] px-4 sm:px-7 py-6 sm:py-8 flex flex-col justify-between min-h-[120px] sm:min-h-[140px] shadow-sm">
            <div>
              <p className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
                {avgFamilyIncome !== null
                  ? `$${Math.round(avgFamilyIncome * animProgress).toLocaleString()}`
                  : "N/A"}
              </p>
            </div>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mt-4">
              Avg family income
            </p>
          </div>
        </div>
      </div>

      {/* 2. Gender Distribution */}
      <div>
        <h2 className="flex items-center gap-1.5 text-xl sm:text-[26px] font-black text-[#1E293B] mb-4 sm:mb-6 tracking-tight leading-none">
          Gender Distribution
          <DisclaimerTooltip text={DATA_SOURCE_DISCLAIMERS.collegeScorecard} />
        </h2>

        <div className="bg-white border border-[#EAEFF5] rounded-2xl sm:rounded-[32px] p-4 sm:p-8 shadow-sm">
          <div className="grid grid-cols-2 gap-4 sm:gap-x-16 sm:gap-y-8">
            {/* Student Men */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-700">
                <span>Men (Students)</span>
                <span>
                  {menStudentsPct !== null
                    ? `${(menStudentsPct * animProgress).toFixed(1)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="h-2.5 bg-[#EAEFF5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF5A5A] rounded-full"
                  style={{
                    width:
                      menStudentsPct !== null
                        ? `${menStudentsPct * animProgress}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            {/* Faculty Men */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-700">
                <span>Men (Faculty)</span>
                <span>
                  {menFacultyPct !== null
                    ? `${(menFacultyPct * animProgress).toFixed(1)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="h-2.5 bg-[#EAEFF5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF5A5A] rounded-full"
                  style={{
                    width:
                      menFacultyPct !== null
                        ? `${menFacultyPct * animProgress}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            {/* Student Women */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-700">
                <span>Women (Students)</span>
                <span>
                  {womenStudentsPct !== null
                    ? `${(womenStudentsPct * animProgress).toFixed(1)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="h-2.5 bg-[#EAEFF5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#EC4899] rounded-full"
                  style={{
                    width:
                      womenStudentsPct !== null
                        ? `${womenStudentsPct * animProgress}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            {/* Faculty Women */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-700">
                <span>Women (Faculty)</span>
                <span>
                  {womenFacultyPct !== null
                    ? `${(womenFacultyPct * animProgress).toFixed(1)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="h-2.5 bg-[#EAEFF5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#EC4899] rounded-full"
                  style={{
                    width:
                      womenFacultyPct !== null
                        ? `${womenFacultyPct * animProgress}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Repayment Progress By Group */}
      <div>
        <div className="bg-white border border-[#EAEFF5] rounded-2xl sm:rounded-[32px] p-4 sm:p-8 shadow-sm flex flex-col gap-5 sm:gap-6">
          <h3 className="flex items-center gap-1.5 text-lg sm:text-[20px] font-black text-slate-900 tracking-tight leading-none">
            Repayment Progress By Group
            <DisclaimerTooltip
              text={DATA_SOURCE_DISCLAIMERS.collegeScorecard}
            />
          </h3>

          <div className="flex flex-col gap-5">
            {/* All Borrowers */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] sm:text-xs font-bold text-slate-900">
                <span>All Borrowers - 3yr Progress</span>
                <span>
                  {allBorrowersPct !== null
                    ? `${Math.round(allBorrowersPct * animProgress)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="h-3 bg-[#EAEFF5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#10B981] rounded-full"
                  style={{
                    width:
                      allBorrowersPct !== null
                        ? `${allBorrowersPct * animProgress}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            {/* Graduates */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] sm:text-xs font-bold text-slate-900">
                <span>Graduates</span>
                <span>
                  {graduatesPct !== null
                    ? `${Math.round(graduatesPct * animProgress)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="h-3 bg-[#EAEFF5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F59E0B] rounded-full"
                  style={{
                    width:
                      graduatesPct !== null
                        ? `${graduatesPct * animProgress}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            {/* Non-Completers */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] sm:text-xs font-bold text-slate-900">
                <span>Non - Completers</span>
                <span>
                  {nonCompletersPct !== null
                    ? `${Math.round(nonCompletersPct * animProgress)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="h-3 bg-[#EAEFF5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3B82F6] rounded-full"
                  style={{
                    width:
                      nonCompletersPct !== null
                        ? `${nonCompletersPct * animProgress}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Year 1 - Year 3 Change & Completers vs Non-Completers Tables */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {/* Year 1 - Year 3 Change */}
        <div className="bg-white border border-[#EAEFF5] rounded-2xl sm:rounded-[32px] p-4 sm:p-8 shadow-sm flex flex-col gap-4 sm:gap-5">
          <h4 className="text-sm sm:text-[16px] font-black text-slate-900 tracking-tight leading-none">
            Year 1 - Year 3 Change
          </h4>
          <div className="flex flex-col">
            <div className="flex justify-between py-2.5 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-400">
              <span className="truncate mr-2">Loan Borrowers yr 1</span>
              <span className="text-slate-900 font-extrabold">
                {yr1 !== null ? yr1.toLocaleString() : "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-400">
              <span className="truncate mr-2">Repaying Yr 3</span>
              <span className="text-slate-900 font-extrabold">
                {yr3 !== null ? yr3.toLocaleString() : "N/A"}
              </span>
            </div>
            <div className="flex justify-between pt-2.5 text-[10px] sm:text-xs font-black text-slate-900">
              <span>Net Change</span>
              <span
                className={
                  netChange !== null && netChange < 0
                    ? "text-[#FF5A5A]"
                    : netChange !== null
                      ? "text-[#10B981]"
                      : "text-slate-400"
                }
              >
                {netChange !== null
                  ? netChange > 0
                    ? `+${netChange.toLocaleString()}`
                    : netChange.toLocaleString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Completers vs Non-Completers */}
        <div className="bg-white border border-[#EAEFF5] rounded-2xl sm:rounded-[32px] p-4 sm:p-8 shadow-sm flex flex-col gap-4 sm:gap-5">
          <h4 className="text-sm sm:text-[16px] font-black text-slate-900 tracking-tight leading-none">
            Completers vs Non-Completers
          </h4>
          <div className="flex flex-col">
            <div className="flex justify-between py-2.5 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-400">
              <span className="truncate mr-2">Graduates Repaying</span>
              <span className="text-slate-900 font-extrabold">
                {yr3Completers !== null
                  ? yr3Completers.toLocaleString()
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-400">
              <span className="truncate mr-2">Non-Grads Repaying</span>
              <span className="text-slate-900 font-extrabold">
                {yr3NonCompleters !== null
                  ? yr3NonCompleters.toLocaleString()
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between pt-2.5 text-[10px] sm:text-xs font-black text-slate-900">
              <span className="truncate mr-2">Grads Advantage</span>
              <span className="text-[#3B82F6]">
                {graduatesAdvantage !== null
                  ? `+${graduatesAdvantage.toLocaleString()}`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
