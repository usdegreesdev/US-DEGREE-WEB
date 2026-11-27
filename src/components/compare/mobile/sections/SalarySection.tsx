"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { College } from "@/types/university/ComparisonTable";
import { relativePercentDiff } from "../../shared/metrics";
import { DATA_SOURCE_DISCLAIMERS } from "@/constants/dataSourceDisclaimers";
import MobileSectionCard from "../MobileSectionCard";
import MobileMetricRow from "../MobileMetricRow";

interface SalarySectionProps {
  colleges: College[];
  onViewDetails: (id: string) => void;
  /** null when no compared college has a value. */
  averageSalary: number | null;
  highestSalaryId: string;
}

export default function SalarySection({
  colleges,
  onViewDetails,
  averageSalary,
  highestSalaryId,
}: SalarySectionProps) {
  return (
    <MobileSectionCard
      title="Avg. Salary"
      subtitle="Average annual earnings for graduates"
      tooltip={DATA_SOURCE_DISCLAIMERS.compareAvgSalary}
    >
      {colleges.map((college) => {
        const salary = college.medianSalary;

        if (salary === null) {
          return (
            <MobileMetricRow key={college.id} college={college} onViewDetails={onViewDetails}>
              <span className="font-mono font-bold text-slate-400 shrink-0">N/A</span>
            </MobileMetricRow>
          );
        }

        const isTop = highestSalaryId === college.id;
        const diffPercent = relativePercentDiff(salary, averageSalary);

        return (
          <MobileMetricRow key={college.id} college={college} onViewDetails={onViewDetails}>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-end">
                <span className={`font-mono font-bold ${isTop ? "text-[#3F51B5]" : "text-slate-900"}`}>
                  ${salary.toLocaleString()}
                </span>
                {college.salaryCohort && (
                  <span className="font-mono text-gray-400 text-[8px] font-bold uppercase leading-tight">
                    {college.salaryCohort} graduates
                  </span>
                )}
              </div>
              {colleges.length > 1 && diffPercent !== null && (
                <div>
                  {isTop ? (
                    <span className="text-[9px] font-black uppercase text-[#3F51B5] bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      ⭐ Top
                    </span>
                  ) : diffPercent > 0 ? (
                    <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" />+{diffPercent}%
                    </span>
                  ) : diffPercent < 0 ? (
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <TrendingDown className="w-2.5 h-2.5" />
                      {Math.abs(diffPercent)}%
                    </span>
                  ) : (
                    <span className="text-[9px] font-medium text-gray-400">Avg</span>
                  )}
                </div>
              )}
            </div>
          </MobileMetricRow>
        );
      })}
    </MobileSectionCard>
  );
}
