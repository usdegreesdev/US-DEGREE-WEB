"use client";

import React, { useState } from "react";
import { message } from "antd";
import { useRouter } from "next/navigation";
import { fetchProfile } from "@/lib/auth/api";
import { College } from "@/types/university/ComparisonTable";
import { useAuth } from "@/context/AuthContext";
import { emptyProfile, mergeProfile } from "@/components/userprofile/ProfileDashboard";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import AcademicAlignmentModal from "./AcademicAlignmentModal";
import GenerateReportButton from "./report/GenerateReportButton";
import ConfirmReportModal from "./report/ConfirmReportModal";
import ProfileWarningModal from "./report/ProfileWarningModal";
import { useReportGeneration } from "./report/useReportGeneration";
import { buildAlignmentPrompt, type AlignmentPrompt } from "./report/buildAlignmentPrompt";
import {
  MIN_PROFILE_COMPLETION_FOR_REPORT,
  SELECT_COLLEGES_WARNING,
} from "./report/reportConfig";

interface CompareHeaderProps {
  comparedIds: string[];
  comparedColleges: College[];
}

const EMPTY_LABELS = { degrees: [], fields: [], states: [] };

export default function CompareHeader({
  comparedIds,
  comparedColleges,
}: CompareHeaderProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [isProfileWarningOpen, setIsProfileWarningOpen] = useState(false);
  const [alignmentPrompt, setAlignmentPrompt] = useState<AlignmentPrompt | null>(null);

  const router = useRouter();
  const { user } = useAuth();
  const { isGenerating, isGenerated, generationStep, progress, start, isMounted } =
    useReportGeneration(comparedIds, comparedColleges);

  const hasNoColleges = !comparedIds || comparedIds.length === 0;

  const startReportGeneration = () => {
    setIsConfirmOpen(false);
    return start();
  };

  // Gate report generation on profile completeness, then open the
  // confirmation modal listing the selected colleges. The actual generation
  // is deferred to handleGenerateReport (the modal's "Generate").
  const handleOpenConfirm = async () => {
    if (hasNoColleges) {
      message.warning(SELECT_COLLEGES_WARNING);
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
      if (calculateProfileCompletion(profile) < MIN_PROFILE_COMPLETION_FOR_REPORT) {
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

  // Entry point for the confirm modal's "Generate": check alignment first,
  // then generate straight away or ask the user to confirm.
  const handleGenerateReport = async () => {
    if (hasNoColleges) {
      message.warning(SELECT_COLLEGES_WARNING);
      return;
    }
    setIsCheckingProfile(true);
    let prompt: AlignmentPrompt | null = null;
    try {
      prompt = await buildAlignmentPrompt(user, comparedColleges);
    } finally {
      if (isMounted.current) setIsCheckingProfile(false);
    }
    if (!isMounted.current) return;
    if (prompt) {
      // Same state update: the confirm modal closes as the alignment modal
      // opens, so the two are never shown together.
      setIsConfirmOpen(false);
      setAlignmentPrompt(prompt);
      return;
    }
    await startReportGeneration();
  };

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

      <GenerateReportButton
        isGenerating={isGenerating}
        isGenerated={isGenerated}
        isCheckingProfile={isCheckingProfile}
        isDisabled={comparedIds.length === 0}
        generationStep={generationStep}
        progress={progress}
        onClick={handleOpenConfirm}
      />

      <ConfirmReportModal
        open={isConfirmOpen}
        colleges={comparedColleges}
        loading={isCheckingProfile}
        onCancel={() => setIsConfirmOpen(false)}
        onGenerate={handleGenerateReport}
      />

      <AcademicAlignmentModal
        open={alignmentPrompt !== null}
        saved={alignmentPrompt?.saved ?? EMPTY_LABELS}
        current={alignmentPrompt?.current ?? EMPTY_LABELS}
        onGoBack={() => setAlignmentPrompt(null)}
        onContinue={() => {
          setAlignmentPrompt(null);
          void startReportGeneration();
        }}
      />

      <ProfileWarningModal
        open={isProfileWarningOpen}
        onClose={() => setIsProfileWarningOpen(false)}
        onSkip={() => {
          setIsProfileWarningOpen(false);
          setIsConfirmOpen(true);
        }}
        onCompleteProfile={() => {
          setIsProfileWarningOpen(false);
          router.push("/profile#profile_info_card");
        }}
      />
    </div>
  );
}
