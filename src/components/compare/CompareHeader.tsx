"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button, message, Modal } from "antd";
import { useRouter } from "next/navigation";
import { Check, FileText, Loader2, MapPin, Sparkles, X } from "lucide-react";
import { authedFetch, fetchProfile } from "@/lib/auth/api";
import { College } from "@/types/university/ComparisonTable";
import { useAuth } from "@/context/AuthContext";
import { emptyProfile, mergeProfile } from "@/components/userprofile/ProfileDashboard";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import { toSafeHttpUrl } from "@/lib/url/httpUrl";

// Below this, we ask the user to finish their profile before generating a
// report so the AI has enough signal (academics + preferences) to personalize it.
const MIN_PROFILE_COMPLETION_FOR_REPORT = 90;

// Each step owns a slice of the progress bar. The bar eases toward the current
// step's ceiling and parks there until the next step starts, so it always
// creeps forward without ever pretending to be finished — the real completion
// (100%) only comes from the API response.
const GENERATION_STEPS: { label: string; ceiling: number }[] = [
  { label: "Analyzing your profile", ceiling: 18 },
  { label: "Gathering college data", ceiling: 40 },
  { label: "Generating AI insights", ceiling: 65 },
  { label: "Building your report", ceiling: 84 },
  { label: "Finalizing PDF", ceiling: 95 },
];

const STEP_DURATION_MS = 2000;
const PROGRESS_TICK_MS = 60;

interface CompareHeaderProps {
  comparedIds: string[];
  comparedColleges: College[];
}

export default function CompareHeader({
  comparedIds,
  comparedColleges,
}: CompareHeaderProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [isProfileWarningOpen, setIsProfileWarningOpen] = useState(false);
  const [generationStep, setGenerationStep] = useState<number>(-1);
  const [progress, setProgress] = useState(0);
  const [isGenerated, setIsGenerated] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  const stopTicker = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Gate report generation on profile completeness, then open the
  // confirmation modal listing the selected colleges. The actual generation
  // is deferred to handleGenerateReport (the modal's "Generate").
  const handleOpenConfirm = async () => {
    if (!comparedIds || comparedIds.length === 0) {
      message.warning(
        "Please select at least two college to compare before generating a report.",
      );
      return;
    }

    // Compare is public — generating a report is not. Send signed-out
    // visitors to login instead; their compared colleges (kept locally,
    // synced to the backend on login) are still there once they're back.
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("open-auth-modal", { detail: { mode: "login" } }),
      );
      return;
    }

    setIsCheckingProfile(true);
    try {
      const data = await fetchProfile<Record<string, unknown>>();
      const profile = mergeProfile(emptyProfile(user), data);
      const completion = calculateProfileCompletion(profile);
      if (completion < MIN_PROFILE_COMPLETION_FOR_REPORT) {
        setIsProfileWarningOpen(true);
        return;
      }
    } catch (err) {
      console.error("Failed to check profile completion:", err);
      // Fail open — don't block report generation on a profile-check hiccup.
    } finally {
      setIsCheckingProfile(false);
    }

    setIsConfirmOpen(true);
  };

  const handleGenerateReport = async () => {
    if (!comparedIds || comparedIds.length === 0) {
      message.warning(
        "Please select at least two college to compare before generating a report.",
      );
      return;
    }

    setIsConfirmOpen(false);
    setIsGenerated(false);
    setIsGenerating(true);
    setGenerationStep(0);
    setProgress(0);

    // A single ticker drives both the step label and the bar. The bar eases
    // toward the active step's ceiling (fast at first, slower as it approaches)
    // so it keeps visibly moving even while a step takes longer than expected.
    stopTicker();
    const startedAt = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const step = Math.min(
        Math.floor(elapsed / STEP_DURATION_MS),
        GENERATION_STEPS.length - 1,
      );
      setGenerationStep(step);
      setProgress((prev) => {
        const ceiling = GENERATION_STEPS[step].ceiling;
        if (prev >= ceiling) return prev;
        return Math.min(ceiling, prev + (ceiling - prev) * 0.06 + 0.12);
      });
    }, PROGRESS_TICK_MS);

    const key = "generate-report";
    message.open({
      key,
      type: "loading",
      content: "Analyzing metrics & generating your AI decision report...",
      duration: 0,
    });

    // One entry per compared program — the same unitid can legitimately
    // repeat here (same college, different programs), so this is NOT
    // deduped by unitid. Entries without a specific program attached
    // (cipCode "default") omit program fields; the backend falls back to
    // `programId` for those.
    const selectedColleges = comparedColleges.map((college) => ({
      unitid: Number(college.unitid),
      cipCode: college.cipCode && college.cipCode !== "default" ? college.cipCode : undefined,
      programName: college.programName || undefined,
      credentialTitle: college.credentialTitle || undefined,
    }));

    const invalidEntry = selectedColleges.find((c) => Number.isNaN(c.unitid));
    if (invalidEntry) {
      console.error("comparedColleges contains an unresolved unitid", {
        raw: comparedColleges,
        resolved: selectedColleges,
      });
      stopTicker();
      if (isMounted.current) {
        setIsGenerating(false);
        setGenerationStep(-1);
        setProgress(0);
      }
      message.open({
        key,
        type: "error",
        content: "One of the selected colleges couldn't be identified. Please remove and re-add it, then try again.",
        duration: 3,
      });
      return;
    }

    try {
      const res = await authedFetch("/report/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedColleges,
          programId: 20015, // Fallback for entries with no program attached
        }),
      });

      if (res.status === 402) {
        // No report credits left (backend STRIPE_REQUIRE_PAYMENT) — send them to buy more.
        stopTicker();
        if (isMounted.current) {
          setIsGenerating(false);
          setGenerationStep(-1);
          setProgress(0);
        }
        message.open({
          key,
          type: "warning",
          content: "You're out of report credits. Redirecting to pricing...",
          duration: 2,
        });
        router.push("/pricing");
        return;
      }

      if (!res.ok) {
        throw new Error(`Report generation failed: ${res.status}`);
      }

      const result = (await res.json()) as {
        reportId?: string;
        pdfUrl: string;
      };

      stopTicker();

      if (isMounted.current) {
        setIsGenerating(false);
        setIsGenerated(true);
        setProgress(100);
      }

      message.open({
        key,
        type: "success",
        content: "Premium PDF report generated successfully!",
        duration: 2,
      });

      // Show "Generated" green button state for 1.5s
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (isMounted.current) {
        const safePdfUrl = toSafeHttpUrl(result.pdfUrl);
        if (result.reportId) {
          router.push("/profile#reports_section");
        } else if (safePdfUrl) {
          window.open(safePdfUrl, "_blank", "noopener,noreferrer");
        }
      }
    } catch (err) {
      console.error("Report generation error:", err);
      stopTicker();
      if (isMounted.current) {
        setIsGenerating(false);
        setGenerationStep(-1);
        setProgress(0);
      }
      message.open({
        key,
        type: "error",
        content: "Failed to generate the report. Please try again.",
        duration: 3,
      });
    }
  };

  // The button label stays put while a report is generating — the moving parts
  // (progress bar, percentage, step line below) carry the status instead, so
  // nothing flickers or resizes under the cursor.
  const buttonLabel = isGenerated
    ? "Report Ready"
    : isGenerating
      ? "Generating Report"
      : isCheckingProfile
        ? "Checking Profile"
        : "Generate AI Report";

  const isBusy = isGenerating || isCheckingProfile;
  const isDisabled = comparedIds.length === 0;

  const buttonBgClass = isGenerated
    ? "bg-gradient-to-r from-green-500 to-emerald-600"
    : "bg-gradient-to-r from-blue-600 to-indigo-600";

  const statusLine = isGenerated
    ? "Report ready — opening it now"
    : isGenerating && generationStep >= 0
      ? GENERATION_STEPS[generationStep].label
      : isCheckingProfile
        ? "Checking your profile"
        : "";

  return (
    <div className="mb-10 text-center lg:text-left flex flex-col lg:flex-row justify-between items-center gap-6">
      <div>
        <div className="flex items-center gap-2 justify-center lg:justify-start mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#3F51B5] bg-blue-50 px-3 py-1 rounded-full">
            Interactive Decision Engine
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
          Compare <span className="text-[#3F51B5]">U.S. Colleges</span>
        </h1>
        <p className="text-gray-500 font-medium text-lg mt-2 tracking-tight">
          Compare academic metrics, annual tuition fees, and career outcomes.
        </p>
      </div>

      <div className="shrink-0 w-full sm:w-[268px]">
        <button
          type="button"
          disabled={isDisabled || isBusy || isGenerated}
          aria-busy={isGenerating}
          aria-live="polite"
          onClick={handleOpenConfirm}
          className={`${buttonBgClass} relative w-full overflow-hidden border-none rounded-xl h-12 text-white shadow-md transition-all duration-300
            ${isDisabled ? "opacity-50 cursor-not-allowed grayscale" : isBusy || isGenerated ? "cursor-default" : "cursor-pointer hover:shadow-lg hover:brightness-110"}`}
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
            {(isGenerating || isGenerated) && (
              <span className="absolute right-4 tabular-nums text-xs font-black text-white/90">
                {Math.round(progress)}%
              </span>
            )}
          </span>

          {/* Track pinned to the bottom edge of the button. */}
          {(isGenerating || isGenerated) && (
            <span className="absolute bottom-0 left-0 h-[3px] w-full bg-black/15" aria-hidden>
              <span
                className="block h-full bg-white transition-[width] duration-200 ease-linear"
                style={{ width: `${progress}%` }}
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

      {/* Confirmation modal: review the selected colleges before generating. */}
      <Modal
        open={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        footer={null}
        closeIcon={null}
        centered
        width={460}
        styles={{
          body: { padding: 0 },
          container: { padding: 0, borderRadius: 20, overflow: "hidden" },
        }}
        className="font-sans"
      >
        {/* Header band (brand blue) */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-left relative">
          <button
            aria-label="Close"
            onClick={() => setIsConfirmOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-white" />
            <h3 className="text-lg font-black text-white tracking-tight">
              Generate AI Decision Report
            </h3>
          </div>
          <p className="text-blue-100 text-xs font-medium">
            We&apos;ll analyze the {comparedColleges.length} program
            {comparedColleges.length === 1 ? "" : "s"} below and build your
            premium PDF report.
          </p>
        </div>

        {/* Selected colleges list */}
        <div className="px-6 py-5 bg-white">
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">
            Colleges in this report
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {comparedColleges.map((college) => (
              <div
                key={college.id}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-[#FAFBFD]"
              >
                <div className="w-9 h-9 bg-white border border-gray-100 rounded-lg p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                    <div className="w-full h-full rounded bg-blue-100 flex items-center justify-center font-bold text-[#3F51B5] text-sm select-none">
                      {college.name ? college.name.trim().charAt(0).toUpperCase() : "U"}
                    </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate leading-snug">
                    {college.shortName || college.name}
                  </p>
                  <p className="text-[11px] text-gray-400 font-semibold flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {college.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-end gap-3">
          <Button
            danger
            onClick={() => setIsConfirmOpen(false)}
            className="font-bold rounded-xl h-10 px-5 border border-red-200 text-red-500 hover:!text-red-600 hover:!border-red-400"
          >
            Cancel
          </Button>
          <Button
            type="primary"
            icon={<FileText className="w-4 h-4" />}
            onClick={handleGenerateReport}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none font-bold rounded-xl h-10 px-5 shadow-md flex items-center gap-2"
          >
            Generate
          </Button>
        </div>
      </Modal>

      {/* Incomplete-profile gate: shown instead of the confirm modal when the
          profile is below the completion threshold. */}
      <Modal
        open={isProfileWarningOpen}
        onCancel={() => setIsProfileWarningOpen(false)}
        footer={null}
        closeIcon={null}
        centered
        width={440}
        styles={{
          body: { padding: 0 },
          container: { padding: 0, borderRadius: 20, overflow: "hidden" },
        }}
        className="font-sans"
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-left relative">
          <button
            aria-label="Close"
            onClick={() => setIsProfileWarningOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-white" />
            <h3 className="text-lg font-black text-white tracking-tight">
             Complete Your Profile for Better Insights
            </h3>
          </div>
        </div>

        <div className="px-6 py-5 bg-white">
          <p className="text-sm text-slate-600 leading-relaxed">
           Your report will be generated based on the colleges in your Compare list. By completing your profile, 
           we can personalize the analysis to match your academic background, 
           interests, and career goals helping you make a more informed decision.
          </p>
        </div>

        <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-end gap-3">
          <Button
            onClick={() => {
              setIsProfileWarningOpen(false);
              setIsConfirmOpen(true);
            }}
            className="font-bold rounded-xl h-10 px-5"
          >
            Not Now
          </Button>
          <Button
            type="primary"
            onClick={() => {
              setIsProfileWarningOpen(false);
              router.push("/profile#profile_info_card");
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none font-bold rounded-xl h-10 px-5 shadow-md"
          >
            Complete Profile
          </Button>
        </div>
      </Modal>
    </div>
  );
}
