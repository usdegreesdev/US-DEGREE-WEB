"use client";

import { Button, Modal } from "antd";
import { FileText, MapPin, Sparkles, X } from "lucide-react";
import type { College } from "@/types/university/ComparisonTable";

interface ConfirmReportModalProps {
  open: boolean;
  colleges: College[];
  loading: boolean;
  onCancel: () => void;
  onGenerate: () => void;
}

/** Confirmation modal: review the selected colleges before generating. */
export default function ConfirmReportModal({
  open,
  colleges,
  loading,
  onCancel,
  onGenerate,
}: ConfirmReportModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
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
          onClick={onCancel}
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
          We&apos;ll analyze the {colleges.length} program
          {colleges.length === 1 ? "" : "s"} below and build your premium PDF report.
        </p>
      </div>

      {/* Selected colleges list */}
      <div className="px-6 py-5 bg-white">
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">
          Colleges in this report
        </p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {colleges.map((college) => (
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
                <p
                  className="text-sm font-bold text-slate-800 line-clamp-2 break-words leading-snug"
                  title={college.name || college.shortName}
                >
                  {college.name || college.shortName}
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
          onClick={onCancel}
          className="font-bold rounded-xl h-10 px-5 border border-red-200 text-red-500 hover:!text-red-600 hover:!border-red-400"
        >
          Cancel
        </Button>
        <Button
          type="primary"
          icon={<FileText className="w-4 h-4" />}
          onClick={onGenerate}
          loading={loading}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none font-bold rounded-xl h-10 px-5 shadow-md flex items-center gap-2"
        >
          Generate
        </Button>
      </div>
    </Modal>
  );
}
