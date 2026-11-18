"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { College } from "@/types/university/ComparisonTable";
import { percentagePointsDiff } from "../../shared/metrics";
import MobileSectionCard from "../MobileSectionCard";
import MobileMetricRow from "../MobileMetricRow";

interface GraduationRateSectionProps {
  colleges: College[];
  onViewDetails: (id: string) => void;
  averageGraduationRate: number;
  highestGraduationId: string;
}

export default function GraduationRateSection({
  colleges,
  onViewDetails,
  averageGraduationRate,
  highestGraduationId,
}: GraduationRateSectionProps) {
  return (
    <MobileSectionCard title="Graduation Rate" subtitle="within 150% of normal time">
      {colleges.map((college) => {
        const rate = college.graduationRate;

        if (rate === null) {
          return (
            <MobileMetricRow key={college.id} college={college} onViewDetails={onViewDetails}>
              <span className="font-mono font-bold text-slate-400 shrink-0">N/A</span>
            </MobileMetricRow>
          );
        }

        const isHighest = highestGraduationId === college.id;
        const diffPoints = percentagePointsDiff(rate, averageGraduationRate);

        return (
          <MobileMetricRow key={college.id} college={college} onViewDetails={onViewDetails}>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`font-mono font-bold ${isHighest ? "text-green-600" : "text-slate-900"}`}>
                {(rate * 100).toFixed(0)}%
              </span>
              {colleges.length > 1 && (
                <div>
                  {isHighest ? (
                    <span className="text-[9px] font-black uppercase text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      🏆 Highest
                    </span>
                  ) : diffPoints > 0 ? (
                    <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" />+{diffPoints.toFixed(0)}%
                    </span>
                  ) : diffPoints < 0 ? (
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <TrendingDown className="w-2.5 h-2.5" />
                      {Math.abs(diffPoints).toFixed(0)}%
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
