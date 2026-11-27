"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { College } from "@/types/university/ComparisonTable";
import { relativePercentDiff } from "../../shared/metrics";
import { DATA_SOURCE_DISCLAIMERS } from "@/constants/dataSourceDisclaimers";
import MobileSectionCard from "../MobileSectionCard";
import MobileMetricRow from "../MobileMetricRow";

interface TuitionOutOfStateSectionProps {
  colleges: College[];
  onViewDetails: (id: string) => void;
  /** null when no compared college has a value. */
  averageTuition: number | null;
  lowestTuitionId: string;
}

export default function TuitionOutOfStateSection({
  colleges,
  onViewDetails,
  averageTuition,
  lowestTuitionId,
}: TuitionOutOfStateSectionProps) {
  return (
    <MobileSectionCard
      title="Tuition (Out-of-State)"
      subtitle="National student baseline rate"
      tooltip={DATA_SOURCE_DISCLAIMERS.compareTuitionOutOfState}
    >
      {colleges.map((college) => {
        const tuition = college.tuitionOutOfState;

        if (tuition === null) {
          return (
            <MobileMetricRow key={college.id} college={college} onViewDetails={onViewDetails}>
              <span className="font-mono font-bold text-slate-400 shrink-0">N/A</span>
            </MobileMetricRow>
          );
        }

        const percentDiff = relativePercentDiff(tuition, averageTuition);
        const isCheapest = lowestTuitionId === college.id;

        return (
          <MobileMetricRow key={college.id} college={college} onViewDetails={onViewDetails}>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`font-mono font-bold ${isCheapest ? "text-green-600" : "text-slate-900"}`}
              >
                ${tuition.toLocaleString()}
              </span>
              {colleges.length > 1 && percentDiff !== null && (
                <div>
                  {percentDiff < 0 ? (
                    <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <TrendingDown className="w-2.5 h-2.5" />
                      {Math.abs(percentDiff)}%
                    </span>
                  ) : percentDiff > 0 ? (
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" />+{percentDiff}%
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
