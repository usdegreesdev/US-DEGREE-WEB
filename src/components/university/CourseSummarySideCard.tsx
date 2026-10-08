"use client";

import { useState } from "react";
import {
  GraduationCap,
  Building2,
  DollarSign,
  Clock,
  Layers,
  Info,
} from "lucide-react";
import { CourseSummarySideCardProps } from "@/types/university/CourseSummarySideCard";
import { getCredentialLevelInfo } from "@/constants/credentialLevel";
import { trackApplyClick } from "@/lib/auth/api";
import { trackEvent } from "@/lib/analytics";
import { toSafeHttpUrl } from "@/lib/url/httpUrl";

export default function CourseSummarySideCard({
  degree,
  programType,
  financialAid,
  schoolUrl,
  credentialLevel,
  credentialTitle,
  universityId,
  universityName,
  cipCode,
}: CourseSummarySideCardProps) {
  const [expanded, setExpanded] = useState(false);
  const credentialInfo = getCredentialLevelInfo(credentialLevel);

  const safeUrl = toSafeHttpUrl(schoolUrl);

  const handleApplyClick = () => {
    // Client-side analytics event
    trackEvent("apply_now_click", {
      university_id: universityId,
      university_name: universityName,
      degree,
      credential_title: credentialTitle || programType,
      credential_level: credentialLevel,
      cip_code: cipCode,
      school_url: schoolUrl,
    });

    // Backend tracking call (attaches user auth header if logged in)
    trackApplyClick({
      universityId,
      universityName,
      cipCode,
      degree,
      credentialLevel,
      credentialTitle: credentialTitle || programType || null,
      schoolUrl,
    });
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
          Course Summary
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Verified details for this program.
        </p>
      </div>

      {/* Zone 1 — verified program data */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-slate-500">
            <GraduationCap size={16} className="text-slate-400" />
            Degree
          </span>
          <span className="text-sm font-bold text-slate-900 text-right max-w-[180px] leading-tight">
            {degree}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-slate-500">
            <Building2 size={16} className="text-slate-400" />
            Program Type
          </span>
          <span className="text-sm font-medium text-slate-800">
            {credentialTitle || programType || "N/A"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-slate-500">
            <DollarSign size={16} className="text-slate-400" />
            Financial Aid
          </span>
          <span className="text-sm font-semibold text-emerald-500">
            {financialAid}
          </span>
        </div>
      </div>

      {/* Zone 2 — category-level credential info. Hidden entirely (divider
          included) when the credential_level code is missing/unrecognized. */}
      {credentialInfo && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              About this credential type
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <Clock size={14} className="text-slate-400" />
                Typical Duration
              </span>
              <span className="text-xs font-medium text-slate-500">
                {credentialInfo.typicalDuration}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <Layers size={14} className="text-slate-400" />
                Education Level
              </span>
              <span className="text-xs font-medium text-slate-500">
                {credentialInfo.educationLevel}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors pt-1"
            >
              <Info size={13} />
              What does this typically include?
            </button>

            {expanded && (
              <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-slate-200">
                A {credentialInfo.title} typically leads to{" "}
                {credentialInfo.receives}. Typical Duration shown is standard
                for this credential type — this specific program&apos;s
                actual length may vary.
              </p>
            )}
          </div>
        </>
      )}

      {/* CTA */}
      {safeUrl ? (
        <a
          href={safeUrl}
          onClick={handleApplyClick}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-center rounded-[16px] bg-gradient-to-r from-[#2b55ff] to-[#9333ea] py-4 text-[15px] font-black text-white hover:opacity-95 hover:shadow-lg active:scale-[0.99] transition-all shadow-md shadow-blue-500/10 block"
        >
          Apply Now
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="w-full text-center rounded-[16px] bg-slate-200 py-4 text-[15px] font-black text-slate-400 cursor-not-allowed block"
        >
          Apply Now
        </button>
      )}
    </div>
  );
}
