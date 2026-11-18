"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { College } from "@/types/university/ComparisonTable";
import { percentagePointsDiff } from "../../shared/metrics";
import DesktopRowLabel from "../DesktopRowLabel";

interface GraduationRateRowProps {
  colleges: College[];
  /** null when no compared college has a value. */
  averageGraduationRate: number | null;
  highestGraduationId: string;
}

export default function GraduationRateRow({
  colleges,
  averageGraduationRate,
  highestGraduationId,
}: GraduationRateRowProps) {
  return (
    <tr className="hover:bg-slate-50/30 transition-colors">
      <DesktopRowLabel title="Graduation Rate" subtitle="within 150% of normal time" />
      {colleges.map((college) => {
        const rate = college.graduationRate;

        if (rate === null) {
          return (
            <td
              key={college.id}
              className="p-4 md:p-8 text-center font-mono text-sm md:text-xl font-bold text-slate-400"
            >
              N/A
            </td>
          );
        }

        const isHighest = highestGraduationId === college.id;
        const diffPoints = percentagePointsDiff(rate, averageGraduationRate);

        return (
          <td key={college.id} className="p-4 md:p-8 text-center">
            <div className="flex flex-col items-center">
              <span
                className={`text-sm md:text-xl font-black ${isHighest ? "text-green-600" : "text-slate-900"}`}
              >
                {(rate * 100).toFixed(0)}%
              </span>

              {colleges.length > 1 && diffPoints !== null && (
                <div className="mt-1 md:mt-2 flex items-center gap-0.5 md:gap-1">
                  {isHighest ? (
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-wider text-green-600 bg-green-50 px-1.5 md:px-2 py-0.5 rounded-md">
                      🏆 Highest
                    </span>
                  ) : diffPoints > 0 ? (
                    <span className="text-[8px] md:text-[10px] font-bold text-green-500 flex items-center">
                      <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />
                      +{diffPoints.toFixed(0)}% avg
                    </span>
                  ) : diffPoints < 0 ? (
                    <span className="text-[8px] md:text-[10px] font-bold text-gray-400 flex items-center">
                      <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />
                      {Math.abs(diffPoints).toFixed(0)}% avg
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
