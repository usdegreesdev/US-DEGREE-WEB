"use client";

import React from "react";
import { Button, Modal } from "antd";
import { Sparkles, X } from "lucide-react";

/** Display-ready labels (resolved by the caller from existing lookups). */
export interface AlignmentLabels {
  degrees: string[];
  fields: string[];
  states: string[];
}

interface AcademicAlignmentModalProps {
  open: boolean;
  saved: AlignmentLabels;
  current: AlignmentLabels;
  onContinue: () => void;
  onGoBack: () => void;
}

/** "Bachelor's in Computer Science / Texas, USA" — absent parts are dropped. */
export function formatAlignmentSummary({
  degrees,
  fields,
  states,
}: AlignmentLabels): string {
  const degree = degrees.join(", ");
  const field = fields.join(", ");
  const academic = degree && field ? `${degree} in ${field}` : degree || field;
  const place = states.length ? `${states.join(", ")}, USA` : "";
  return [academic, place].filter(Boolean).join(" / ");
}

export default function AcademicAlignmentModal({
  open,
  saved,
  current,
  onContinue,
  onGoBack,
}: AcademicAlignmentModalProps) {
  const sections = [
    { title: "Saved Profile Preference", text: formatAlignmentSummary(saved) },
    { title: "Current Comparison", text: formatAlignmentSummary(current) },
  ];

  return (
    <Modal
      open={open}
      onCancel={onGoBack}
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-left relative">
        <button
          aria-label="Close"
          onClick={onGoBack}
          className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 mb-1 pr-6">
          <Sparkles className="w-5 h-5 text-white shrink-0" />
          <h3 className="text-lg font-black text-white tracking-tight">
            Your comparison is different from your profile prefrences
          </h3>
        </div>
        <p className="text-blue-100 text-xs font-medium">
          Your saved academic preferences and current comparison have different
          selections.
        </p>
      </div>

      <div className="px-6 py-5 bg-white space-y-4">
        {sections.map((s) => (
          <div key={s.title}>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
              {s.title}
            </p>
            <p className="text-sm font-bold text-slate-800 p-2.5 rounded-xl border border-gray-100 bg-[#FAFBFD]">
              {s.text}
            </p>
          </div>
        ))}
        <p className="text-xs text-slate-500 leading-relaxed">
          We&apos;ll use your current comparison to generate this report. Your
          saved profile preferences will remain unchanged.
        </p>
      </div>

      <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-end gap-3">
        <Button onClick={onGoBack} className="font-bold rounded-xl h-10 px-5">
          Go back
        </Button>
        <Button
          type="primary"
          onClick={onContinue}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none font-bold rounded-xl h-10 px-5 shadow-md"
        >
          Continue with comparison
        </Button>
      </div>
    </Modal>
  );
}
