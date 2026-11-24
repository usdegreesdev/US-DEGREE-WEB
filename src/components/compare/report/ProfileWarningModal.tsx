"use client";

import { Button, Modal } from "antd";
import { Sparkles, X } from "lucide-react";

interface ProfileWarningModalProps {
  open: boolean;
  onClose: () => void;
  onSkip: () => void;
  onCompleteProfile: () => void;
}

/** Incomplete-profile gate: shown instead of the confirm modal when the profile is below the completion threshold. */
export default function ProfileWarningModal({
  open,
  onClose,
  onSkip,
  onCompleteProfile,
}: ProfileWarningModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
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
          onClick={onClose}
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
          Your report will be generated based on the colleges in your Compare list. By
          completing your profile, we can personalize the analysis to match your academic
          background, interests, and career goals helping you make a more informed decision.
        </p>
      </div>

      <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-end gap-3">
        <Button onClick={onSkip} className="font-bold rounded-xl h-10 px-5">
          Not Now
        </Button>
        <Button
          type="primary"
          onClick={onCompleteProfile}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none font-bold rounded-xl h-10 px-5 shadow-md"
        >
          Complete Profile
        </Button>
      </div>
    </Modal>
  );
}
