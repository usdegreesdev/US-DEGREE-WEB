"use client";

import { College } from "@/types/university/ComparisonTable";
import { DATA_SOURCE_DISCLAIMERS } from "@/constants/dataSourceDisclaimers";
import DesktopRowLabel from "../DesktopRowLabel";

interface TuitionInStateRowProps {
  colleges: College[];
}

export default function TuitionInStateRow({ colleges }: TuitionInStateRowProps) {
  return (
    <tr className="hover:bg-slate-50/30 transition-colors">
      <DesktopRowLabel
        title="Tuition (In-State)"
        subtitle="Annual tuition & tuition fees"
        tooltip={DATA_SOURCE_DISCLAIMERS.compareTuitionInState}
      />
      {colleges.map((college) => (
        <td key={college.id} className="p-4 md:p-8 text-center font-mono">
          <span className="text-sm md:text-xl font-bold text-slate-900">
            {college.tuitionInState !== null
              ? `$${college.tuitionInState.toLocaleString()}`
              : "N/A"}
          </span>
          {college.tuitionInState !== null && (
            <span className="block text-gray-400 text-[8px] md:text-[10px] font-bold uppercase mt-0.5 md:mt-1">
              per year
            </span>
          )}
        </td>
      ))}
    </tr>
  );
}
