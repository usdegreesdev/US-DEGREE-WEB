"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { message } from "antd";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/auth/api";
import { markFreshReport } from "@/lib/freshReport";
import { toSafeHttpUrl } from "@/lib/url/httpUrl";
import type { College } from "@/types/university/ComparisonTable";
import {
  GENERATION_STEPS,
  PROGRESS_TICK_MS,
  SELECT_COLLEGES_WARNING,
  STEP_DURATION_MS,
} from "./reportConfig";

const MESSAGE_KEY = "generate-report";

/**
 * Owns the report-generation run: the step/progress ticker, the
 * POST /report/generate call and the follow-up navigation.
 */
export function useReportGeneration(
  comparedIds: string[],
  comparedColleges: College[],
) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generationStep, setGenerationStep] = useState(-1);
  const [progress, setProgress] = useState(0);

  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  const stopTicker = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopTicker();
    };
  }, [stopTicker]);

  // A single ticker drives both the step label and the bar. The bar eases
  // toward the active step's ceiling (fast at first, slower as it approaches)
  // so it keeps visibly moving even while a step takes longer than expected.
  const startTicker = () => {
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
  };

  const resetAfterFailure = () => {
    stopTicker();
    if (isMounted.current) {
      setIsGenerating(false);
      setGenerationStep(-1);
      setProgress(0);
    }
  };

  const start = async () => {
    if (!comparedIds || comparedIds.length === 0) {
      message.warning(SELECT_COLLEGES_WARNING);
      return;
    }

    setIsGenerated(false);
    setIsGenerating(true);
    setGenerationStep(0);
    setProgress(0);
    startTicker();

    message.open({
      key: MESSAGE_KEY,
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
      cipCode:
        college.cipCode && college.cipCode !== "default" ? college.cipCode : undefined,
      programName: college.programName || undefined,
      credentialTitle: college.credentialTitle || undefined,
    }));

    if (selectedColleges.some((c) => Number.isNaN(c.unitid))) {
      console.error("comparedColleges contains an unresolved unitid", {
        raw: comparedColleges,
        resolved: selectedColleges,
      });
      resetAfterFailure();
      message.open({
        key: MESSAGE_KEY,
        type: "error",
        content:
          "One of the selected colleges couldn't be identified. Please remove and re-add it, then try again.",
        duration: 3,
      });
      return;
    }

    try {
      const res = await authedFetch("/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedColleges,
          programId: 20015, // Fallback for entries with no program attached
        }),
      });

      if (!res.ok) {
        throw new Error(`Report generation failed: ${res.status}`);
      }

      const result = (await res.json()) as { reportId?: string; pdfUrl: string };

      stopTicker();
      if (isMounted.current) {
        setIsGenerating(false);
        setIsGenerated(true);
        setProgress(100);
      }

      message.open({
        key: MESSAGE_KEY,
        type: "success",
        content: "Premium PDF report generated successfully!",
        duration: 2,
      });

      // Show "Generated" green button state for 1.5s
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (isMounted.current) {
        const safePdfUrl = toSafeHttpUrl(result.pdfUrl);
        if (result.reportId) {
          markFreshReport(result.reportId);
          router.push("/profile#reports_section");
        } else if (safePdfUrl) {
          window.open(safePdfUrl, "_blank", "noopener,noreferrer");
        }
      }
    } catch (err) {
      console.error("Report generation error:", err);
      resetAfterFailure();
      message.open({
        key: MESSAGE_KEY,
        type: "error",
        content: "Failed to generate the report. Please try again.",
        duration: 3,
      });
    }
  };

  return { isGenerating, isGenerated, generationStep, progress, start, isMounted };
}
