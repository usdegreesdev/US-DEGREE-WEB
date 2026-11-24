"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { GENERATION_STEPS } from "./reportConfig";

interface GenerateReportButtonProps {
  isGenerating: boolean;
  isGenerated: boolean;
  isCheckingProfile: boolean;
  isDisabled: boolean;
  generationStep: number;
  progress: number;
  onClick: () => void;
}

/** The "Generate AI Report" button with its progress bar, plus the status line + step dots below it. */
export default function GenerateReportButton({
  isGenerating,
  isGenerated,
  isCheckingProfile,
  isDisabled,
  generationStep,
  progress,
  onClick,
}: GenerateReportButtonProps) {
  const isBusy = isGenerating || isCheckingProfile;
  const showProgress = isGenerating || isGenerated;
  const clamped = Math.min(100, Math.max(0, progress));

  // The label stays put while generating — the moving parts (bar, percentage,
  // step line below) carry the status so nothing resizes under the cursor.
  const buttonLabel = isGenerated
    ? "Report Ready"
    : isGenerating
      ? "Generating Report"
      : isCheckingProfile
        ? "Checking Profile"
        : "Generate AI Report";

  const buttonBgClass = isGenerated
    ? "bg-gradient-to-r from-green-500 to-emerald-600"
    : "bg-gradient-to-r from-blue-600 to-indigo-600";

  const statusLine = isGenerated
    ? "Report ready — Adding to profile now.."
    : isGenerating && generationStep >= 0
      ? GENERATION_STEPS[generationStep].label
      : isCheckingProfile
        ? "Checking your profile"
        : "";

  const stateClass = isDisabled
    ? "opacity-50 cursor-not-allowed grayscale"
    : isBusy || isGenerated
      ? "cursor-default"
      : "cursor-pointer hover:shadow-lg hover:brightness-110";

  return (
    <div className="shrink-0 w-full sm:w-[268px]">
      <button
        type="button"
        disabled={isDisabled || isBusy || isGenerated}
        aria-busy={isGenerating}
        aria-live="polite"
        onClick={onClick}
        className={`${buttonBgClass} relative w-full overflow-hidden border-none rounded-xl h-12 text-white shadow-md transition-all duration-300 ${stateClass}`}
      >
        {/* Progress fill — a lighter wash that sweeps across the button. */}
        <span
          className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-200 ease-linear"
          style={{ width: `${progress}%` }}
          aria-hidden
        />

        {/* Shimmer, only while work is actually in flight. */}
        {isBusy && (
          <span className="absolute inset-0 overflow-hidden" aria-hidden>
            <span className="absolute top-0 -left-[40%] h-full w-[40%] skew-x-[-25deg] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.4s_linear_infinite]" />
          </span>
        )}

        {/* Label row — fixed content, no width jitter. */}
        <span className="relative z-10 flex items-center justify-center gap-2 px-5 text-sm font-bold">
          {isGenerated ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : isBusy ? (
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 shrink-0" />
          )}
          <span>{buttonLabel}</span>
          {/* Absolutely placed so the centered label never shifts when the
              percentage appears. */}
          {showProgress && (
            <span className="absolute right-4 tabular-nums text-xs font-black text-white/90">
              {Math.round(progress)}%
            </span>
          )}
        </span>

        {/* Track pinned to the bottom edge of the button. */}
        {showProgress && (
          <span className="absolute bottom-0 left-0 h-1 w-full bg-black/20" aria-hidden>
            {/* Full-width red→green gradient, revealed left-to-right by
                clipping, so the leading edge's color tracks the progress. */}
            <span
              className="block h-full w-full bg-gradient-to-r from-red-500 via-amber-400 to-green-400 transition-[clip-path] duration-200 ease-linear"
              style={{ clipPath: `inset(0 ${100 - clamped}% 0 0)` }}
            />
          </span>
        )}
      </button>

      {/* Status line + step dots. The row is always reserved so the header
          never shifts when generation starts. */}
      <div className="h-5 mt-2 flex items-center justify-center lg:justify-start gap-2">
        {statusLine && (
          <>
            <span
              key={statusLine}
              className="animate-text-change text-xs font-semibold text-gray-500"
            >
              {statusLine}
            </span>
            {isGenerating && (
              <span className="flex items-center gap-1" aria-hidden>
                {GENERATION_STEPS.map((step, i) => (
                  <span
                    key={step.label}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i < generationStep
                        ? "w-1.5 bg-blue-600"
                        : i === generationStep
                          ? "w-4 bg-blue-600 animate-pulse"
                          : "w-1.5 bg-gray-200"
                    }`}
                  />
                ))}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
