"use client";

import { MapPin, Trash2 } from "lucide-react";
import { Button } from "antd";
import { College } from "@/types/university/ComparisonTable";
import CollegeAvatar from "../shared/CollegeAvatar";
import CollegeBadges from "../shared/CollegeBadges";
import ActionButtons from "../shared/ActionButtons";

interface MobileCollegeCardProps {
  college: College;
  isBestValue: boolean;
  isHighSalary: boolean;
  isLowestCost: boolean;
  onRemove: (id: string) => void;
  onViewDetails: (id: string) => void;
}

/** One card in the horizontally-scrolling "school directory" strip at the top of the mobile view. */
export default function MobileCollegeCard({
  college,
  isBestValue,
  isHighSalary,
  isLowestCost,
  onRemove,
  onViewDetails,
}: MobileCollegeCardProps) {
  return (
    <div className="min-w-[260px] max-w-[280px] bg-white border border-gray-100 rounded-2xl p-4 shadow-sm snap-start flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <CollegeAvatar name={college.name} unitid={college.unitid} size="md" />
            <div className="min-w-0 flex-1">
              <h4
                className="font-black text-slate-900 text-sm leading-snug hover:text-[#3F51B5] cursor-pointer transition-colors break-words"
                onClick={() => onViewDetails(college.id)}
              >
                {college.name || college.shortName}
              </h4>
              <p className="text-[10px] text-gray-400 font-bold flex items-center gap-0.5 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{college.location}</span>
              </p>
            </div>
          </div>
          <Button
            type="text"
            shape="circle"
            size="small"
            className="shrink-0 -mr-1 -mt-1"
            icon={<Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-500 transition-colors" />}
            onClick={() => onRemove(college.id)}
          />
        </div>

        {(college.programName || college.credentialTitle) && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1">
            {college.programName && (
              <span className="text-xs font-bold text-slate-800 leading-snug break-words">
                {college.programName}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              {college.credentialTitle && (
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/80">
                  {college.credentialTitle}
                </span>
              )}
              {college.cipCode && college.cipCode !== "default" && (
                <span className="text-[9px] font-black uppercase tracking-wider text-[#3F51B5] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/80">
                  CIP {college.cipCode}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          <CollegeBadges
            isPrivate={college.isPrivate}
            isBestValue={isBestValue}
            isHighSalary={isHighSalary}
            isLowestCost={isLowestCost}
            size="sm"
          />
        </div>
      </div>

      <ActionButtons
        schoolUrl={college.schoolUrl}
        onViewDetails={() => onViewDetails(college.id)}
        layout="mobile"
      />
    </div>
  );
}
