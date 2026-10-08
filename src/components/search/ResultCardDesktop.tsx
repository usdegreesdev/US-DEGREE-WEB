"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Clock, BookOpen, MapPin } from "lucide-react";
import { Button } from "antd";
import CompareIconAnimation from "./CompareIconAnimation";
import type { ResultCardViewProps } from "./resultCardTypes";

const RING_PATH =
  "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831";

function StatTile({
  label,
  value,
  valueClass,
  className = "flex-1 min-w-[80px] px-3",
}: {
  label: string;
  value: string;
  valueClass: string;
  className?: string;
}) {
  return (
    <div
      className={`${className} flex flex-col bg-gray-50 border border-gray-100 rounded-xl py-2.5`}
    >
      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </span>
      <span className={`text-sm font-extrabold ${valueClass}`}>{value}</span>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-gray-500 uppercase font-semibold">
        {label}
      </p>
      <p className="font-bold text-gray-900 text-xs">{value}</p>
    </div>
  );
}

export default function ResultCardDesktop({
  university,
  location,
  degree,
  schoolType,
  admissionRate,
  avgGpa,
  satAct,
  duration,
  specializations,
  gradRate,
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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-4 items-start">
          <div
            className={`w-10 h-10 rounded-lg ${logoColor} flex items-center justify-center text-white font-bold text-xl shrink-0`}
          >
            {university.charAt(0)}
          </div>
          <div>
            <Link href={universityHref}>
              <h2 className="text-base font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                {university}
              </h2>
            </Link>
            <div className="flex items-center text-gray-500 text-xs mt-0.5">
              <MapPin size={12} className="mr-1" />
              {location}
            </div>
          </div>
        </div>
      </div>

      {/* Match Badge (Absolute on Desktop) */}
      <div className="absolute top-5 right-5 flex flex-col items-center bg-blue-50/50 border border-blue-100 rounded-xl p-2 w-28 transition-all duration-300 hover:border-blue-200">
        <button
          onClick={onOpenFit}
          className="w-full text-[9px] bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-1 px-1 rounded-lg mb-1.5 text-center transition-all duration-200 shadow-sm leading-tight hover:scale-105 active:scale-95 whitespace-nowrap"
        >
          {shouldShowFit ? "Update Fit" : "Find your fit score"}
        </button>
        <span className="text-[8px] font-bold text-blue-600 uppercase mb-1 text-center leading-tight">
          {shouldShowFit ? "Your Fit Score" : "Match Score"}
        </span>
        <div
          className={`relative w-11 h-11 flex items-center justify-center transition-all duration-500 ${!shouldShowFit ? "filter blur-[1.5px] opacity-80" : ""}`}
        >
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 36 36"
          >
            <path
              className="text-gray-200 stroke-current"
              d={RING_PATH}
              fill="none"
              strokeWidth="3"
            />
            <path
              className="text-blue-600 stroke-current"
              strokeDasharray={`${displayScore}, 100`}
              d={RING_PATH}
              fill="none"
              strokeWidth="3"
            />
          </svg>
          <span className="absolute text-[10px] font-extrabold text-blue-900">
            {displayScore}%
          </span>
        </div>
      </div>

      {/* Degree Info */}
      <div className="mb-5 md:pr-28">
        <h3 className="text-sm text-red-500 font-bold mb-2">{degree}</h3>

        <div className="flex flex-wrap gap-5 mb-3">
          <InfoField label="Admission Rate" value={admissionRate} />
          <InfoField label="Avg. GPA" value={avgGpa} />
          <InfoField label="SAT/ACT" value={satAct} />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
          <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-1 rounded-md border border-gray-100">
            <Clock size={10} className="text-gray-400" />
            {duration}
          </span>
          {schoolType && (
            <span
              className={`flex items-center gap-1 px-1.5 py-1 rounded-md border font-bold ${
                schoolType.toLowerCase().includes("public")
                  ? "bg-green-50 border-green-100 text-green-700"
                  : "bg-purple-50 border-purple-100 text-purple-700"
              }`}
            >
              {schoolType.split(",")[0]}
            </span>
          )}
          <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-1 rounded-md border border-gray-100">
            <BookOpen size={10} className="text-gray-400" />
            Specializations: {specializations}
          </span>
        </div>
      </div>

      {/* Stat Tiles */}
      <div className="flex flex-wrap gap-3 py-4 border-y border-gray-100 mb-4">
        <StatTile
          label="Employment Rate"
          value={gradRate > 0 ? `${gradRate}%` : "N/A"}
          valueClass="text-gray-900"
        />
        <StatTile
          label="Median Salary"
          value={medianSalary ?? "N/A"}
          valueClass="text-green-600"
        />
        <StatTile
          label="20yr ROI"
          value={roi ?? "N/A"}
          valueClass="text-blue-600"
        />
        <StatTile
          label="Sticker Price"
          value={estCost ?? "N/A"}
          valueClass="text-gray-900"
          className="min-w-[90px] px-4"
        />
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            type={isCompared ? "primary" : "default"}
            onClick={onToggleCompare}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`flex items-center gap-1.5 h-8 text-[11px] font-bold rounded-full transition-all duration-300 ${
              isCompared
                ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 scale-105 shadow-sm"
                : "text-gray-600 border-gray-300 hover:text-blue-600 hover:border-blue-600 hover:scale-105"
            }`}
            icon={
              <CompareIconAnimation active={isCompared} hovered={isHovered} />
            }
          >
            {isCompared ? "Added to Compare" : "Compare"}
          </Button>

          <Button
            type={isSavedCollege ? "primary" : "default"}
            onClick={onToggleSave}
            loading={isSaving}
            className={`flex items-center gap-1.5 h-8 text-[11px] font-bold rounded-full transition-all duration-300 ${
              isSavedCollege
                ? "bg-rose-500 border-rose-500 text-white hover:bg-rose-600 hover:border-rose-600 scale-105 shadow-sm"
                : "text-gray-600 border-gray-300 hover:text-rose-500 hover:border-rose-500 hover:scale-105"
            }`}
            icon={
              <Heart
                size={13}
                className={isSavedCollege ? "fill-current" : ""}
              />
            }
          >
            {isSavedCollege ? "Saved" : "Save"}
          </Button>
        </div>

        <div className="flex gap-2">
          {formattedSchoolUrl ? (
            <a
              href={formattedSchoolUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-1.5 rounded-full text-[11px] font-bold transition text-center flex items-center justify-center"
            >
              Visit Website
            </a>
          ) : (
            <button
              disabled
              className="border border-gray-200 text-gray-400 px-4 py-1.5 rounded-full text-[11px] font-bold cursor-not-allowed text-center"
            >
              Visit Website
            </button>
          )}
          <Link
            href={universityHref}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-[11px] font-bold transition text-center"
          >
            View Full Details
          </Link>
        </div>
      </div>
    </div>
  );
}
