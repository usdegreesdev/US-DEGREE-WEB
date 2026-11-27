"use client";

import { College } from "@/types/university/ComparisonTable";
import { DATA_SOURCE_DISCLAIMERS } from "@/constants/dataSourceDisclaimers";
import MobileSectionCard from "../MobileSectionCard";
import MobileMetricRow from "../MobileMetricRow";

interface TuitionInStateSectionProps {
  colleges: College[];
  onViewDetails: (id: string) => void;
}

export default function TuitionInStateSection({
  colleges,
  onViewDetails,
}: TuitionInStateSectionProps) {
  return (
    <MobileSectionCard
      title="Tuition (In-State)"
      subtitle="Annual tuition & tuition fees"
      tooltip={DATA_SOURCE_DISCLAIMERS.compareTuitionInState}
    >
      {colleges.map((college) => (
        <MobileMetricRow key={college.id} college={college} onViewDetails={onViewDetails}>
          <span className="font-mono font-bold text-slate-900 shrink-0">
            {college.tuitionInState !== null
              ? `$${college.tuitionInState.toLocaleString()}`
              : "N/A"}
          </span>
        </MobileMetricRow>
      ))}
    </MobileSectionCard>
  );
}
