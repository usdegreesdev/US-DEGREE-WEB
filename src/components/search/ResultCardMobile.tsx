"use client";

import Link from "next/link";
import { Heart, Clock, MapPin } from "lucide-react";
import { Button } from "antd";
import CompareIconAnimation from "./CompareIconAnimation";
import type { ResultCardViewProps } from "./resultCardTypes";

const RING_PATH =
  "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831";

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider truncate">
        {label}
      </p>
      <p className={`text-[10px] font-bold truncate ${valueClass}`}>{value}</p>
    </div>
  );
}

export default function ResultCardMobile({
  university,
  location,
  degree,
  schoolType,
  admissionRate,
  satAct,
  duration,
  estCost,
  medianSalary,
  roi,
  logoColor,
  universityHref,
  formattedSchoolUrl,
  shouldShowFit,
  displayScore,
  isCompared,
  isSavedCollege,
  isSaving,
  onOpenFit,
  onToggleCompare,
  onToggleSave,
}: ResultCardViewProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col gap-2 max-w-full">
      {/* 1. Header Row */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex gap-2 items-center min-w-0 flex-1">
          <div
            className={`w-7 h-7 rounded-lg ${logoColor} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm`}
          >
            {university.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-wrap">
              <Link href={universityHref} className="min-w-0 max-w-full">
                <h2 className="text-xs font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer truncate leading-tight">
                  {university}
                </h2>
              </Link>
              {schoolType && (
                <span
                  className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                    schoolType.toLowerCase().includes("public")
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-purple-50 border-purple-200 text-purple-700"
                  }`}
                >
                  {schoolType.split(",")[0]}
                </span>
              )}
            </div>
            <div className="flex items-center text-gray-500 text-[10px] mt-0.5 min-w-0">
              <MapPin size={10} className="mr-0.5 text-gray-400 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          </div>
        </div>

        {/* Fit Score Button — compact but high-visibility card */}
        <button
          type="button"
          onClick={onOpenFit}
          aria-label={
            shouldShowFit ? "Update your fit score" : "Find your fit score"
          }
          className={`flex items-center gap-2 shrink-0 rounded-xl pl-2.5 pr-1.5 py-1.5 transition-all cursor-pointer active:scale-95 self-center shadow-sm border ${
            shouldShowFit
              ? "bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-700 text-white"
              : "bg-white border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          <div className="flex flex-col items-start leading-none">
            <span
              className={`text-[9px] font-extrabold uppercase tracking-wide ${
                shouldShowFit ? "text-white" : "text-blue-700"
              }`}
            >
              {shouldShowFit ? "Your Fit" : "Fit Score"}
            </span>
            <span
              className={`text-[8px] font-semibold mt-0.5 whitespace-nowrap ${
                shouldShowFit ? "text-blue-100" : "text-blue-500/80"
              }`}
            >
              {shouldShowFit ? "Tap to update" : "Tap to find"}
            </span>
          </div>
          <div
            className={`relative w-8 h-8 flex items-center justify-center shrink-0 transition-all duration-500 ${!shouldShowFit ? "filter blur-[1.5px] opacity-80" : ""}`}
          >
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                className={
                  shouldShowFit
                    ? "text-white/25 stroke-current"
                    : "text-blue-100 stroke-current"
                }
                d={RING_PATH}
                fill="none"
                strokeWidth="4"
              />
              <path
                className={
                  shouldShowFit
                    ? "text-white stroke-current"
                    : "text-blue-600 stroke-current"
                }
                strokeDasharray={`${displayScore}, 100`}
                strokeLinecap="round"
                d={RING_PATH}
                fill="none"
                strokeWidth="4"
              />
            </svg>
            <span
              className={`absolute text-[9px] font-black ${
                shouldShowFit ? "text-white" : "text-blue-950"
              }`}
            >
              {displayScore}
            </span>
          </div>
        </button>
      </div>

      {/* 2. Program Details & Metrics Strip */}
      <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100 flex flex-col gap-1 max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-1 min-w-0">
          <h3 className="text-xs font-bold text-rose-600 leading-tight truncate">
            {degree}
          </h3>
          <span className="flex items-center gap-0.5 text-[9.5px] text-slate-500 shrink-0">
            <Clock size={9} className="text-slate-400" /> {duration}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1 pt-1 border-t border-slate-200/60 min-w-0">
          <Metric
            label="Admission"
            value={admissionRate}
            valueClass="text-slate-800"
          />
          <Metric label="SAT/ACT" value={satAct} valueClass="text-slate-800" />
          <Metric
            label="Salary"
            value={medianSalary ?? "N/A"}
            valueClass="text-emerald-600"
          />
          <Metric
            label="Cost"
            value={estCost ?? "N/A"}
            valueClass="text-slate-800"
          />
          <Metric
            label="20yr ROI"
            value={roi ?? "N/A"}
            valueClass="text-blue-600"
          />
        </div>
      </div>

      {/* 3. Mobile Action Buttons */}
      <div className="flex items-center justify-between gap-1 pt-0.5 max-w-full">
        <div className="flex items-center gap-1">
          <Button
            type={isCompared ? "primary" : "default"}
            onClick={onToggleCompare}
            className={`flex items-center gap-0.5 h-6 px-2 text-[9.5px] font-bold rounded-full transition-all ${
              isCompared
                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                : "text-slate-600 border-slate-300 hover:text-blue-600"
            }`}
            icon={<CompareIconAnimation active={isCompared} hovered={false} />}
          >
            {isCompared ? "Compared" : "Compare"}
          </Button>

          <Button
            type={isSavedCollege ? "primary" : "default"}
            onClick={onToggleSave}
            loading={isSaving}
            className={`flex items-center gap-0.5 h-6 px-2 text-[9.5px] font-bold rounded-full transition-all ${
              isSavedCollege
                ? "bg-rose-500 border-rose-500 text-white shadow-sm"
                : "text-slate-600 border-slate-300 hover:text-rose-500"
            }`}
            icon={
              <Heart
                size={10}
                className={isSavedCollege ? "fill-current" : ""}
              />
            }
          >
            {isSavedCollege ? "Saved" : "Save"}
          </Button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {formattedSchoolUrl && (
            <a
              href={formattedSchoolUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-blue-600 text-blue-600 px-2 py-0.5 rounded-full text-[9.5px] font-bold transition text-center whitespace-nowrap"
            >
              Website
            </a>
          )}
          <Link
            href={universityHref}
            className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[9.5px] font-bold transition text-center whitespace-nowrap shadow-sm"
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}
