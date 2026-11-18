"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { College } from "@/types/university/ComparisonTable";
import { relativePercentDiff } from "../../shared/metrics";
import DesktopRowLabel from "../DesktopRowLabel";

interface TuitionOutOfStateRowProps {
  colleges: College[];
  /** null when no compared college has a value. */
  averageTuition: number | null;
  lowestTuitionId: string;
}

export default function TuitionOutOfStateRow({
  colleges,
  averageTuition,
  lowestTuitionId,
}: TuitionOutOfStateRowProps) {
  return (
    <tr className="hover:bg-slate-50/35 transition-colors">
      <DesktopRowLabel
        title="Tuition (Out-of-State)"
        subtitle="National student baseline rate"
      />
      {colleges.map((college) => {
        const tuition = college.tuitionOutOfState;

        if (tuition === null) {
          return (
            <td
              key={college.id}
              className="p-4 md:p-8 text-center font-mono text-sm md:text-xl font-bold text-slate-400"
            >
              N/A
            </td>
          );
        }

        const percentDiff = relativePercentDiff(tuition, averageTuition);
        const isCheapest = lowestTuitionId === college.id;

        return (
          <td key={college.id} className="p-4 md:p-8 text-center">
            <div className="flex flex-col items-center">
              <span
                className={`text-sm md:text-xl font-black ${isCheapest ? "text-green-600 font-bold" : "text-slate-900"}`}
              >
                ${tuition.toLocaleString()}
              </span>

              {colleges.length > 1 && percentDiff !== null && (
                <div className="mt-1 md:mt-2 flex items-center gap-0.5 md:gap-1">
                  {percentDiff < 0 ? (
                    <span className="text-[8px] md:text-[10px] font-bold text-green-600 bg-green-50 px-1.5 md:px-2 py-0.5 rounded-md flex items-center">
                      <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />
                      {Math.abs(percentDiff)}% lower
                    </span>
                  ) : percentDiff > 0 ? (
                    <span className="text-[8px] md:text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 md:px-2 py-0.5 rounded-md flex items-center">
                      <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />
                      +{percentDiff}% avg
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
