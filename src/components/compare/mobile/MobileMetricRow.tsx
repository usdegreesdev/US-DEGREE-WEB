"use client";

import { College } from "@/types/university/ComparisonTable";
import CollegeLogo from "../shared/CollegeLogo";

interface MobileMetricRowProps {
  college: College;
  onViewDetails: (id: string) => void;
  /** The metric's value (and any trend badge) shown on the right side of the row. */
  children: React.ReactNode;
}

/**
 * One line inside a mobile metric section: the college's logo + name on the
 * left, and whatever value/badge the section wants to show on the right.
 */
export default function MobileMetricRow({ college, onViewDetails, children }: MobileMetricRowProps) {
  return (
    <div className="py-2.5 flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <CollegeLogo name={college.name} unitid={college.unitid} />
        <span
          className="font-bold text-slate-700 break-words leading-snug hover:text-[#3F51B5] cursor-pointer transition-colors"
          onClick={() => onViewDetails(college.id)}
        >
          {college.name || college.shortName}
        </span>
      </div>
      {children}
    </div>
  );
}
