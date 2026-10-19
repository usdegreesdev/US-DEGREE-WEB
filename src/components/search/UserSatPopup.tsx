"use client";

import { X } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface UserSatPopupProps {
  setShowModal: (show: boolean) => void;
  tempGpa: string;
  setTempGpa: (value: string) => void;
  validateGpa: (value: string) => void;
  gpaError: string;
  tempSat: string;
  setTempSat: (value: string) => void;
  validateSat: (value: string) => void;
  satError: string;
  university: string;
  admissionRate: string;
  satAct: string;
  hasSatData: boolean;
  isCalculated: boolean;
  handleClear: () => void;
  handleCalculate: () => void;
}

export default function UserSatPopup({
  setShowModal,
  tempGpa,
  setTempGpa,
  validateGpa,
  gpaError,
  tempSat,
  setTempSat,
  validateSat,
  satError,
  university,
  admissionRate,
  satAct,
  hasSatData,
  isCalculated,
  handleClear,
  handleCalculate,
}: UserSatPopupProps) {
  // Only ever mounted while open (parent renders it conditionally), so the
  // lock is unconditional here — matches the drawer/details-modal convention.
  useBodyScrollLock(true);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full overflow-hidden transform transition-all scale-100">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white relative">
          <button
            onClick={() => setShowModal(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1 transition"
          >
            <X size={16} />
          </button>
          <h3 className="text-base font-bold">Calculate Your Fit Score</h3>
          <p className="text-[11px] text-blue-100 mt-1">
            Enter your academic details to estimate your fit score for{" "}
            <span className="font-semibold">{university}</span>.
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          {/* GPA Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                GPA
              </label>
              <span className="text-[10px] font-semibold text-slate-400">
                (0.0 - 4.0)
              </span>
            </div>
            <input
              type="number"
              min="0.0"
              max="4.0"
              step="0.01"
              value={tempGpa}
              onChange={(e) => {
                const value = e.target.value;
                setTempGpa(value);
                validateGpa(value);
              }}
              placeholder="e.g. 3.75"
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold transition text-slate-800 focus:outline-none
                    ${
                      gpaError
                        ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
            />
            {gpaError && (
              <p className="mt-1 text-[10px] text-red-500 font-medium">
                {gpaError}
              </p>
            )}
          </div>

          {/* SAT Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                SAT Score
              </label>

              {hasSatData && (
                <span className="text-[10px] font-semibold text-slate-400">
                  (400 - 1600)
                </span>
              )}
            </div>

            {hasSatData ? (
              <>
                <input
                  type="number"
                  min="400"
                  max="1600"
                  step="10"
                  value={tempSat}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTempSat(value);
                    validateSat(value);
                  }}
                  placeholder="e.g. 1350"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold transition text-slate-800 focus:outline-none
          ${
            satError
              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          }`}
                />

                {satError && (
                  <p className="mt-1 text-[10px] text-red-500 font-medium">
                    {satError}
                  </p>
                )}
              </>
            ) : (
              <div className="w-full px-3 py-2 rounded-xl border border-slate-100 bg-slate-50 text-xs font-medium text-slate-400 italic">
                Not available for this school
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-500 leading-relaxed">
            {hasSatData ? (
              <>
                Your stats are compared against{" "}
                <span className="font-semibold text-slate-700">
                  {university}
                </span>
                &apos;s admission rate (
                <span className="font-semibold text-slate-700">
                  {admissionRate}
                </span>
                ) and SAT range (
                <span className="font-semibold text-slate-700">{satAct}</span>)
                to calculate your personalized fit!
              </>
            ) : (
              <>
                Your stats are compared against{" "}
                <span className="font-semibold text-slate-700">
                  {university}
                </span>
                &apos;s admission rate (
                <span className="font-semibold text-slate-700">
                  {admissionRate}
                </span>
                ) to calculate your personalized fit!
              </>
            )}
          </div>

          {/* Disclaimer */}
          <div className="text-[9px] text-slate-400 text-center italic">
          *These values are only approximate.
          </div>
        </div>
 
        {/* Modal Actions */}
        <div className="bg-slate-50 px-5 py-3 flex justify-between items-center border-t border-slate-100">
          <div>
            {isCalculated && (
              <button
                onClick={handleClear}
                className="text-[10px] font-bold text-red-500 hover:text-red-700 transition"
              >
                Clear Stats
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCalculate}
              className="px-4 py-1.5 rounded-lg text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
            >
              Calculate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
