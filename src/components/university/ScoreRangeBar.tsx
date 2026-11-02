import React from "react";
import {
  rangeBarGeometry,
  type ScoreRange,
} from "@/lib/university/admissionsGlance";

interface ScoreRangeBarProps {
  label: string;
  range: ScoreRange;
  scaleMin: number;
  scaleMax: number;
  /** Tint of the surrounding card, used for the track. */
  tone?: "blue" | "white";
  /** The viewer's own score; drawn as a marker when inside the scale. */
  marker?: number | null;
}

export default function ScoreRangeBar({
  label,
  range,
  scaleMin,
  scaleMax,
  tone = "white",
  marker = null,
}: ScoreRangeBarProps) {
  const { left, width } = rangeBarGeometry(range, scaleMin, scaleMax);
  const markerLeft =
    marker !== null && marker >= scaleMin && marker <= scaleMax
      ? ((marker - scaleMin) / (scaleMax - scaleMin)) * 100
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-sm font-medium text-slate-700 font-poppins">
          {label}
        </h4>
        <span className="text-xl font-bold text-slate-900 font-lexend">
          {range.low} – {range.high}
        </span>
      </div>
      <div
        role="img"
        aria-label={`SAT range ${range.low} to ${range.high} on a scale of ${scaleMin} to ${scaleMax}${
          markerLeft !== null ? `. Your score: ${marker}` : ""
        }`}
        className={`relative w-full ${markerLeft !== null ? "pt-7" : ""}`}
      >
        <div
          className={`relative h-3 w-full overflow-hidden rounded-full ${
            tone === "blue" ? "bg-blue-100" : "bg-slate-200"
          }`}
        >
          <div
            className="absolute h-full rounded-full bg-[#2054FE]"
            style={{ left: `${left}%`, width: `${width}%`, minWidth: 6 }}
          />
        </div>
        {markerLeft !== null && (
          <div
            className="pointer-events-none absolute bottom-[-6px] top-0 w-0.5 bg-[#A8440A]"
            style={{ left: `${markerLeft}%` }}
          >
            <span
              className={`absolute top-0 whitespace-nowrap text-sm font-bold text-[#A8440A] font-poppins ${
                markerLeft > 80 ? "right-2" : "left-2"
              }`}
            >
              You: {marker}
            </span>
          </div>
        )}
      </div>
      <div
        className="flex justify-between text-xs text-slate-600 font-poppins"
        aria-hidden="true"
      >
        <span>{scaleMin}</span>
        <span>{scaleMax}</span>
      </div>
    </div>
  );
}
