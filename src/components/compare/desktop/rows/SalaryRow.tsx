"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { College } from "@/types/university/ComparisonTable";
import { relativePercentDiff } from "../../shared/metrics";
import DesktopRowLabel from "../DesktopRowLabel";

interface SalaryRowProps {
  colleges: College[];
  /** null when no compared college has a value. */
  averageSalary: number | null;
  highestSalaryId: string;
}

export default function SalaryRow({ colleges, averageSalary, highestSalaryId }: SalaryRowProps) {
  return (
    <tr className="hover:bg-slate-50/30 transition-colors">
      <DesktopRowLabel title="Avg. Salary" subtitle="Average annual earnings for graduates" />
      {colleges.map((college) => {
        const salary = college.medianSalary;

        if (salary === null) {
          return (
            <td
              key={college.id}
              className="p-4 md:p-8 text-center font-mono text-sm md:text-xl font-bold text-slate-400"
            >
              N/A
            </td>
          );
        }

        const isTop = highestSalaryId === college.id;
        const diffPercent = relativePercentDiff(salary, averageSalary);

        return (
          <td key={college.id} className="p-4 md:p-8 text-center font-mono">
            <div className="flex flex-col items-center">
              <span
                className={`text-sm md:text-xl font-black ${isTop ? "text-[#3F51B5]" : "text-slate-900"}`}
              >
                ${salary.toLocaleString()}
              </span>

              {colleges.length > 1 && diffPercent !== null && (
                <div className="mt-1 md:mt-2 flex items-center gap-0.5 md:gap-1">
                  {isTop ? (
                    <span className="text-[8px] md:text-[10px] font-black uppercase text-[#3F51B5] bg-blue-50 px-1.5 md:px-2 py-0.5 rounded-md">
                      ⭐ Top salary
                    </span>
                  ) : diffPercent > 0 ? (
                    <span className="text-[8px] md:text-[10px] font-bold text-green-600 bg-green-50 px-1.5 md:px-2 py-0.5 rounded-md flex items-center animate-pulse">
                      <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />
                      +{diffPercent}% avg
                    </span>
                  ) : diffPercent < 0 ? (
                    <span className="text-[8px] md:text-[10px] font-bold text-gray-400 flex items-center">
                      <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />
                      {Math.abs(diffPercent)}% avg
                    </span>
                  ) : (
                    <span className="text-[8px] md:text-[10px] font-medium text-gray-400">
                      Average
                    </span>
                  )}
                </div>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}
