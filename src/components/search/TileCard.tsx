"use client";

import React from "react";
import Link from "next/link";
import { Heart, MapPin } from "lucide-react";
import CollegeLogo from "../college/CollegeLogo";
import { ResultCardProps } from "./ResultCard";
import {
  toggleCompare as toggleCompareStore,
  useIsCollegeCompared,
  MAX_COMPARE,
} from "../compare/compareMatrixStore";

export default function TileCard({
  id = 1,
  cipCode,
  credentialLevel,
  university,
  location,
  degree,
  specializations,
  schoolType,
  admissionRate,
  gradRate,
  avgSalary,
  estCost,
  roi,
  logoColor,
}: ResultCardProps) {
  const universityHref = {
    pathname: `/university/${id}`,
    query: {
      cip: cipCode,
      name: university,
      city: location.split(", ")[0] || "",
      state: location.split(", ")[1] || "",
      degree: degree,
      // See ResultCard.tsx — `degree` is the program title, `specializations`
      // is the real credential title, needed to disambiguate which
      // credential level of this cip_code to fetch.
      credentialTitle: specializations,
      type: schoolType,
      admissionRate: admissionRate,
      tuition: estCost,
      avgSalary: avgSalary,
      roi: roi,
    },
  };

  // Selected-for-comparison state from the single shared matrix store.
  const compareId = String(id ?? "");
  const isCompared = useIsCollegeCompared(compareId);

  const handleCompareChange = async () => {
    try {
      const result = await toggleCompareStore({
        unitid: compareId,
        cipCode: cipCode || "default",
        programName: cipCode ? degree : undefined,
        credentialLevel: cipCode ? credentialLevel ?? undefined : undefined,
        credentialTitle:
          cipCode && specializations !== "N/A" ? specializations : undefined,
        name: university,
        location,
        schoolType,
      });
      if (result === "full") {
        alert(
          `You can compare a maximum of ${MAX_COMPARE} programs simultaneously.`,
        );
      }
    } catch (err) {
      console.error("Failed to update comparison selection:", err);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2 sm:gap-3 relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-1.5 sm:gap-2 items-center min-w-0">
          <CollegeLogo
            unitid={compareId}
            name={university}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${logoColor} flex items-center justify-center shrink-0 shadow-sm`}
            textClassName="text-white font-bold text-sm sm:text-base"
            sizes="36px"
          />
          <div className="min-w-0">
            <Link href={universityHref}>
              <h2 className="text-xs sm:text-sm font-bold text-gray-900 truncate hover:text-blue-600 transition-colors cursor-pointer">
                {university}
              </h2>
            </Link>
            <div className="flex items-center text-gray-400 text-[9px] sm:text-[11px] mt-0.5">
              <MapPin size={9} className="mr-0.5 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          </div>
        </div>
        <button className="text-gray-200 hover:text-red-400 transition shrink-0 hidden sm:block">
          <Heart size={14} />
        </button>
      </div>

      {/* School type badge */}
      {schoolType && (
        <span
          className={`self-start text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border ${
            schoolType.toLowerCase().includes("public")
              ? "bg-green-50 border-green-100 text-green-700"
              : "bg-purple-50 border-purple-100 text-purple-700"
          }`}
        >
          {schoolType.split(",")[0]}
        </span>
      )}

      {/* Degree */}
      <h3 className="text-[10px] sm:text-[11px] font-bold text-red-500 leading-snug line-clamp-2">
        {degree}
      </h3>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-1.5">
        <div>
          <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase font-semibold">
            Admission
          </p>
          <p className="text-[10px] sm:text-xs font-bold text-gray-900">
            {admissionRate}
          </p>
        </div>
        <div>
          <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase font-semibold">
            20yr ROI
          </p>
          <p className="text-[10px] sm:text-xs font-bold text-blue-600">
            {roi ?? "N/A"}
          </p>
        </div>
        <div>
          <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase font-semibold">
            Avg. Salary
          </p>
          <p className="text-[10px] sm:text-xs font-bold text-green-600">
            {avgSalary ?? "N/A"}
          </p>
        </div>
        <div>
          <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase font-semibold">
            Employment
          </p>
          <p className="text-[10px] sm:text-xs font-bold text-gray-900">
            {gradRate > 0 ? `${gradRate}%` : "N/A"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center justify-between gap-1 border-t border-gray-50 pt-2.5">
        <label className="flex items-center gap-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isCompared}
            onChange={handleCompareChange}
            className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
          />
          <span className="text-[9px] sm:text-[11px] font-medium text-gray-600">
            Compare
          </span>
        </label>
        <Link
          href={universityHref}
          className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[11px] font-bold transition whitespace-nowrap"
        >
          Details
        </Link>
      </div>
    </div>
  );
}
