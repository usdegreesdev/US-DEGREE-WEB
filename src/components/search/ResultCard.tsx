"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Heart, Clock, BookOpen, MapPin } from "lucide-react";
import UserSatPopup from "./UserSatPopup";
import { Button, message } from "antd";
import CompareIconAnimation from "./CompareIconAnimation";
import {
  useSavedCollege,
  toggleSaved,
  SavedLimitError,
} from "./useSavedColleges";
import type { SavedCollege } from "@/lib/auth/api";
import {
  toggleCompare as toggleCompareStore,
  useIsCollegeCompared,
  MAX_COMPARE,
} from "../compare/compareMatrixStore";
import {
  FIT_GPA_KEY,
  FIT_SAT_KEY,
  FIT_SCORE_EVENT,
  FIT_LOGIN_INTENT_KEY,
  writeFitStats,
} from "@/lib/fitScoreSync";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toSafeHttpUrl } from "@/lib/url/httpUrl";

// Matches the "md" breakpoint; only one layout is mounted at a time.
const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

function subscribeToDesktopQuery(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getIsDesktop() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

// No viewport on the server � default to desktop.
function getServerIsDesktop() {
  return true;
}

export interface ResultCardProps {
  id?: number | string;
  /** IPEDS UNITID — stable identifier used for saving the college. */
  unitid?: string;
  cipCode?: string;
  /** IPEDS credential level (e.g. 5/7/17), disambiguating this program's
   * cip_code from another credential level of the same course. */
  credentialLevel?: number | null;
  university: string;
  location: string;
  degree: string;
  schoolType?: string;
  admissionRate: string;
  avgGpa: string;
  satAct: string;
  duration: string;
  specializations: string;
  matchScore: number;
  gradRate: number;
  avgSalary?: string;
  estCost?: string;
  medianSalary?: string;
  roi?: string;
  logoColor: string;
  schoolUrl?: string | null;
}

const parseAdmissionRate = (rateStr: string): number | null => {
  if (!rateStr || rateStr === "N/A") return null;
  const num = parseFloat(rateStr.replace("%", ""));
  return isNaN(num) ? null : num / 100;
};

const parseSatRange = (satStr: string): { min: number; max: number } | null => {
  if (!satStr || satStr === "N/A") return null;
  const parts = satStr.split("-");
  if (parts.length === 2) {
    const min = parseInt(parts[0].trim());
    const max = parseInt(parts[1].trim());
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max };
    }
  }
  return null;
};

const calculateFitScore = (
  userGpa: number,
  userSat: number,
  admissionRateStr: string,
  satActStr: string,
): number => {
  let score = 75; // base score

  // GPA factor
  if (userGpa >= 3.8) {
    score += 15;
  } else if (userGpa >= 3.5) {
    score += 8;
  } else if (userGpa >= 3.0) {
    score += 0;
  } else if (userGpa >= 2.5) {
    score -= 10;
  } else {
    score -= 20;
  }

  // SAT factor
  const satRange = parseSatRange(satActStr);
  if (satRange) {
    const { min, max } = satRange;
    if (userSat >= max) {
      score += 15;
    } else if (userSat >= min) {
      score += 8;
    } else {
      const diff = min - userSat;
      if (diff > 200) {
        score -= 20;
      } else {
        score -= 10;
      }
    }
  } else if (userSat > 0) {
    if (userSat >= 1400) {
      score += 10;
    } else if (userSat >= 1200) {
      score += 5;
    } else if (userSat < 1000) {
      score -= 10;
    }
  }

  // Admission rate selectivity factor
  const admRate = parseAdmissionRate(admissionRateStr);
  if (admRate !== null) {
    if (admRate < 0.15) {
      const isStellar = userGpa >= 3.9 && userSat >= 1500;
      if (!isStellar) {
        score -= 15;
      } else {
        score += 5;
      }
    } else if (admRate < 0.35) {
      const isVeryGood = userGpa >= 3.7 && (userSat >= 1400 || userSat === 0);
      if (!isVeryGood) {
        score -= 8;
      }
    }
  }

  return Math.min(99, Math.max(45, score));
};

export default function ResultCard({
  id = 1,
  unitid,
  cipCode,
  credentialLevel,
  university,
  location,
  degree,
  schoolType,
  admissionRate,
  avgGpa,
  satAct,
  duration,
  specializations,
  matchScore,
  gradRate,
  roi,
  estCost,
  avgSalary,
  medianSalary,
  logoColor,
  schoolUrl,
}: ResultCardProps) {
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopQuery,
    getIsDesktop,
    getServerIsDesktop,
  );
  const formattedSchoolUrl = toSafeHttpUrl(schoolUrl);
  const hasSatData = !!satAct && satAct !== "N/A";

  const [isCalculated, setIsCalculated] = useState(false);
  const [currentScore, setCurrentScore] = useState(matchScore);
  const [showModal, setShowModal] = useState(false);
  const [tempGpa, setTempGpa] = useState<string>("");
  const [tempSat, setTempSat] = useState<string>("");
  const [satError, setSatError] = useState("");
  const [gpaError, setGpaError] = useState("");

  const shouldShowFit = isCalculated && hasSatData;

  const [isHovered, setIsHovered] = useState(false);

  // Canonical id for the comparison store (id and unitid are the same UNITID).
  const compareId = String(unitid ?? id ?? "");
  // Selected-for-comparison state from the single shared matrix store.
  const isCompared = useIsCollegeCompared(compareId);

  const { user } = useAuth();
  const router = useRouter();

  // Open the Calculate Your Fit Score popup — but only for a signed-in user.
  // A signed-out user is sent to the login page; we remember which card they
  // clicked so it re-opens automatically once they return authenticated.
  const handleOpenFit = () => {
    if (!user) {
      try {
        localStorage.setItem(
          FIT_LOGIN_INTENT_KEY,
          JSON.stringify({
            url: window.location.pathname + window.location.search,
            cardId: compareId,
          }),
        );
      } catch {
        // localStorage unavailable — proceed to login without the return hint.
      }
      router.push("/?login=1");
      return;
    }
    setShowModal(true);
  };

  // Saved-college state (shared store; loads once across all visible cards).
  const isSavedCollege = useSavedCollege(unitid);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleSave = async () => {
    // A card with no unitid cannot be saved — report it.
    if (!unitid) {
      console.error(
        `Cannot save "${university}": missing unitid in card data.`,
      );
      message.error("This college can't be saved (missing identifier).");
      return;
    }
    setIsSaving(true);
    try {
      const record: SavedCollege = {
        unitid,
        name: university,
        location,
        tuitionFee: null,
        acceptanceRate: parseAdmissionRate(admissionRate),
        createdAt: new Date().toISOString(),
        schoolUrl: schoolUrl ?? null,
        cipCode: cipCode || null,
        programName: cipCode ? degree : null,
        credentialLevel: cipCode ? (credentialLevel ?? null) : null,
        credentialTitle:
          cipCode && specializations !== "N/A" ? specializations : null,
      };
      const nowSaved = await toggleSaved(unitid, record);
      message.success(
        nowSaved
          ? `Saved ${university} to your colleges.`
          : `Removed ${university} from saved colleges.`,
      );
    } catch (err) {
      if (err instanceof SavedLimitError) {
        message.warning(err.message);
      } else {
        message.error("Could not update saved colleges. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCompare = async () => {
    if (!compareId) {
      message.error("This college can't be compared (missing identifier).");
      return;
    }
    try {
      const result = await toggleCompareStore({
        unitid: compareId,
        cipCode: cipCode || "default",
        programName: cipCode ? degree : undefined,
        credentialLevel: cipCode ? credentialLevel ?? undefined : undefined,
        credentialTitle:
          cipCode && specializations !== "N/A" ? specializations : undefined,
        name: university,
        location,
        schoolType,
        schoolUrl: schoolUrl ?? undefined,
      });
      if (result === "full") {
        message.warning(
          `You can compare a maximum of ${MAX_COMPARE} programs simultaneously.`,
        );
      }
    } catch (err) {
      console.error("Failed to update comparison selection:", err);
      message.error("Could not update your comparison list. Please try again.");
    }
  };

  useEffect(() => {
    // Load from localStorage if present
    const savedGpa = localStorage.getItem(FIT_GPA_KEY);
    const savedSat = localStorage.getItem(FIT_SAT_KEY);
    if (savedGpa) {
      const gpaNum = parseFloat(savedGpa);
      const satNum = parseInt(savedSat || "0") || 0;
      if (!isNaN(gpaNum)) {
        const computed = calculateFitScore(
          gpaNum,
          satNum,
          admissionRate,
          satAct,
        );
        // Post-mount sync from client-only localStorage; see compare effect above.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentScore(computed);
        setIsCalculated(true);
        setTempGpa(savedGpa);
        setTempSat(savedSat || "");
      }
    }

    const handleUpdate = () => {
      const gpa = localStorage.getItem(FIT_GPA_KEY);
      const sat = localStorage.getItem(FIT_SAT_KEY);
      if (gpa) {
        const gpaNum = parseFloat(gpa);
        const satNum = parseInt(sat || "0") || 0;
        if (!isNaN(gpaNum)) {
          const computed = calculateFitScore(
            gpaNum,
            satNum,
            admissionRate,
            satAct,
          );
          setCurrentScore(computed);
          setIsCalculated(true);
          setTempGpa(gpa);
          setTempSat(sat || "");
        }
      } else {
        setIsCalculated(false);
        setCurrentScore(matchScore);
        setTempGpa("");
        setTempSat("");
      }
    };

    window.addEventListener(FIT_SCORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate); // cross-tab / profile sync
    return () => {
      window.removeEventListener(FIT_SCORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [admissionRate, satAct, matchScore]);

  // After a signed-out user logs in and is returned to this page, re-open the
  // fit-score popup on the exact card they originally clicked.
  useEffect(() => {
    if (!user) return;
    let intent: { cardId?: string } | null = null;
    try {
      const raw = localStorage.getItem(FIT_LOGIN_INTENT_KEY);
      intent = raw ? JSON.parse(raw) : null;
    } catch {
      intent = null;
    }
    if (intent?.cardId && String(intent.cardId) === compareId) {
      localStorage.removeItem(FIT_LOGIN_INTENT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowModal(true);
    }
  }, [user, compareId]);

  const handleCalculate = () => {
    const gpaNum = parseFloat(tempGpa);
    const satNum = parseInt(tempSat) || 0;

    if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 4.0) {
      setGpaError("Enter a value between 0.0 and 4.0 only");
      return;
    }

    if (tempSat) {
      if (isNaN(satNum) || satNum < 400 || satNum > 1600) {
        setSatError("Enter a value between 400 and 1600 only");
        return;
      }
    }

    // Persist + broadcast so every other result card and the profile update.
    writeFitStats(gpaNum, tempSat ? satNum : null);

    const computed = calculateFitScore(gpaNum, satNum, admissionRate, satAct);
    setCurrentScore(computed);
    setIsCalculated(true);
    setShowModal(false);
  };

  const handleClear = () => {
    writeFitStats(null, null); // clears both keys + broadcasts
    setIsCalculated(false);
    setCurrentScore(matchScore);
    setTempGpa("");
    setTempSat("");
    setSatError("");
    setGpaError("");
    setShowModal(false);
  };

  const universityHref = {
    pathname: `/university/${id}`,
    query: {
      cip: cipCode,
      name: university,
      city: location.split(", ")[0] || "",
      state: location.split(", ")[1] || "",
      degree: degree,
      // `degree` here is actually the program title (e.g. "Physics"), not a
      // credential level — `specializations` carries the real credential
      // title (e.g. "Doctoral Degree"). The university page needs the real
      // one to disambiguate which credential level of this cip_code to
      // fetch, since the same cip can be offered at more than one level.
      credentialTitle: specializations,
      type: schoolType,
      admissionRate: admissionRate,
      tuition: estCost,
      avgSalary: avgSalary || medianSalary,
      roi: roi,
    },
  };
  const validateSat = (value: string) => {
    if (!value) {
      setSatError("");
      return;
    }

    const sat = Number(value);

    if (sat < 400 || sat > 1600) {
      setSatError("Enter a value between 400 and 1600 only");
    } else {
      setSatError("");
    }
  };

  const validateGpa = (value: string) => {
    if (!value) {
      setGpaError("Enter a value between 0.0 and 4.0 only");
      return;
    }

    const gpa = Number(value);

    if (isNaN(gpa) || gpa < 0 || gpa > 4.0) {
      setGpaError("Enter a value between 0.0 and 4.0 only");
    } else {
      setGpaError("");
    }
  };

  return (
    <>
      {/* ==================== LAPTOP / DESKTOP VIEW (UNCHANGED ORIGINAL) ==================== */}
      {isDesktop && (
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex gap-4 items-start">
            <div
              className={`w-10 h-10 rounded-lg ${logoColor} flex items-center justify-center text-white font-bold text-xl shrink-0`}
            >
              {university.charAt(0)}
            </div>
            <div>
              <Link href={universityHref}>
                <h2 className="text-base font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                  {university}
                </h2>
              </Link>
              <div className="flex items-center text-gray-500 text-xs mt-0.5">
                <MapPin size={12} className="mr-1" />
                {location}
              </div>
            </div>
          </div>
        </div>

        {/* Match Badge (Absolute on Desktop) */}
        <div className="absolute top-5 right-5 flex flex-col items-center bg-blue-50/50 border border-blue-100 rounded-xl p-2 w-28 transition-all duration-300 hover:border-blue-200">
          <button
            onClick={handleOpenFit}
            className="w-full text-[9px] bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-1 px-1 rounded-lg mb-1.5 text-center transition-all duration-200 shadow-sm leading-tight hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            {shouldShowFit ? "Update Fit" : "Find your fit score"}
          </button>
          <span className="text-[8px] font-bold text-blue-600 uppercase mb-1 text-center leading-tight">
            {shouldShowFit ? "Your Fit Score" : "Match Score"}
          </span>
          <div
            className={`relative w-11 h-11 flex items-center justify-center transition-all duration-500 ${!shouldShowFit ? "filter blur-[1.5px] opacity-80" : ""}`}
          >
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                className="text-gray-200 stroke-current"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeWidth="3"
              />
              <path
                className="text-blue-600 stroke-current"
                strokeDasharray={`${shouldShowFit ? currentScore : matchScore}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeWidth="3"
              />
            </svg>
            <span className="absolute text-[10px] font-extrabold text-blue-900">
              {shouldShowFit ? currentScore : matchScore}%
            </span>
          </div>
        </div>

        {/* Degree Info */}
        <div className="mb-5 md:pr-28">
          <h3 className="text-sm text-red-500 font-bold mb-2">{degree}</h3>

          <div className="flex flex-wrap gap-5 mb-3">
            <div>
              <p className="text-[9px] text-gray-500 uppercase font-semibold">
                Admission Rate
              </p>
              <p className="font-bold text-gray-900 text-xs">{admissionRate}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-500 uppercase font-semibold">
                Avg. GPA
              </p>
              <p className="font-bold text-gray-900 text-xs">{avgGpa}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-500 uppercase font-semibold">
                SAT/ACT
              </p>
              <p className="font-bold text-gray-900 text-xs">{satAct}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
            <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-1 rounded-md border border-gray-100">
              <Clock size={10} className="text-gray-400" />
              {duration}
            </span>
            {schoolType && (
              <span
                className={`flex items-center gap-1 px-1.5 py-1 rounded-md border font-bold ${
                  schoolType.toLowerCase().includes("public")
                    ? "bg-green-50 border-green-100 text-green-700"
                    : "bg-purple-50 border-purple-100 text-purple-700"
                }`}
              >
                {schoolType.split(",")[0]}
              </span>
            )}
            <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-1 rounded-md border border-gray-100">
              <BookOpen size={10} className="text-gray-400" />
              Specializations: {specializations}
            </span>
          </div>
        </div>

        {/* Stat Tiles */}
        <div className="flex flex-wrap gap-3 py-4 border-y border-gray-100 mb-4">
          <div className="flex-1 min-w-[80px] flex flex-col bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
              Employment Rate
            </span>
            <span className="text-sm font-extrabold text-gray-900">
              {gradRate > 0 ? `${gradRate}%` : "N/A"}
            </span>
          </div>

          <div className="flex-1 min-w-[80px] flex flex-col bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
              Median Salary
            </span>
            <span className="text-sm font-extrabold text-green-600">
              {medianSalary ?? "N/A"}
            </span>
          </div>

          <div className="flex-1 min-w-[80px] flex flex-col bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
              20yr ROI
            </span>
            <span className="text-sm font-extrabold text-blue-600">
              {roi ?? "N/A"}
            </span>
          </div>

          <div className="flex flex-col bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 min-w-[90px]">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
              Sticker Price
            </span>
            <span className="text-sm font-extrabold text-gray-900">
              {estCost ?? "N/A"}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              type={isCompared ? "primary" : "default"}
              onClick={toggleCompare}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`flex items-center gap-1.5 h-8 text-[11px] font-bold rounded-full transition-all duration-300 ${
                isCompared
                  ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 scale-105 shadow-sm"
                  : "text-gray-600 border-gray-300 hover:text-blue-600 hover:border-blue-600 hover:scale-105"
              }`}
              icon={
                <CompareIconAnimation active={isCompared} hovered={isHovered} />
              }
            >
              {isCompared ? "Added to Compare" : "Compare"}
            </Button>

            <Button
              type={isSavedCollege ? "primary" : "default"}
              onClick={handleToggleSave}
              loading={isSaving}
              className={`flex items-center gap-1.5 h-8 text-[11px] font-bold rounded-full transition-all duration-300 ${
                isSavedCollege
                  ? "bg-rose-500 border-rose-500 text-white hover:bg-rose-600 hover:border-rose-600 scale-105 shadow-sm"
                  : "text-gray-600 border-gray-300 hover:text-rose-500 hover:border-rose-500 hover:scale-105"
              }`}
              icon={
                <Heart
                  size={13}
                  className={isSavedCollege ? "fill-current" : ""}
                />
              }
            >
              {isSavedCollege ? "Saved" : "Save"}
            </Button>
          </div>

          <div className="flex gap-2">
            {formattedSchoolUrl ? (
              <a
                href={formattedSchoolUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-1.5 rounded-full text-[11px] font-bold transition text-center flex items-center justify-center"
              >
                Visit Website
              </a>
            ) : (
              <button
                disabled
                className="border border-gray-200 text-gray-400 px-4 py-1.5 rounded-full text-[11px] font-bold cursor-not-allowed text-center"
              >
                Visit Website
              </button>
            )}
            <Link
              href={universityHref}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-[11px] font-bold transition text-center"
            >
              View Full Details
            </Link>
          </div>
        </div>
      </div>
      )}

      {/* ==================== MOBILE VIEW (ULTRA-COMPACT SPACE SAVING) ==================== */}
      {!isDesktop && (
      <div className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col gap-2 max-w-full">
        {/* 1. Header Row */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex gap-2 items-center min-w-0 flex-1">
            <div
              className={`w-7 h-7 rounded-lg ${logoColor} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm`}
            >
              {university.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 flex-wrap">
                <Link href={universityHref} className="min-w-0 max-w-full">
                  <h2 className="text-xs font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer truncate leading-tight">
                    {university}
                  </h2>
                </Link>
                {schoolType && (
                  <span
                    className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                      schoolType.toLowerCase().includes("public")
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-purple-50 border-purple-200 text-purple-700"
                    }`}
                  >
                    {schoolType.split(",")[0]}
                  </span>
                )}
              </div>
              <div className="flex items-center text-gray-500 text-[10px] mt-0.5 min-w-0">
                <MapPin size={10} className="mr-0.5 text-gray-400 shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            </div>
          </div>

          {/* Fit Score Button — compact but high-visibility card */}
          <button
            type="button"
            onClick={handleOpenFit}
            aria-label={shouldShowFit ? "Update your fit score" : "Find your fit score"}
            className={`flex items-center gap-2 shrink-0 rounded-xl pl-2.5 pr-1.5 py-1.5 transition-all cursor-pointer active:scale-95 self-center shadow-sm border ${
              shouldShowFit
                ? "bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-700 text-white"
                : "bg-white border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            <div className="flex flex-col items-start leading-none">
              <span
                className={`text-[9px] font-extrabold uppercase tracking-wide ${
                  shouldShowFit ? "text-white" : "text-blue-700"
                }`}
              >
                {shouldShowFit ? "Your Fit" : "Fit Score"}
              </span>
              <span
                className={`text-[8px] font-semibold mt-0.5 whitespace-nowrap ${
                  shouldShowFit ? "text-blue-100" : "text-blue-500/80"
                }`}
              >
                {shouldShowFit ? "Tap to update" : "Tap to find"}
              </span>
            </div>
            <div
              className={`relative w-8 h-8 flex items-center justify-center shrink-0 transition-all duration-500 ${!shouldShowFit ? "filter blur-[1.5px] opacity-80" : ""}`}
            >
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  className={
                    shouldShowFit
                      ? "text-white/25 stroke-current"
                      : "text-blue-100 stroke-current"
                  }
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeWidth="4"
                />
                <path
                  className={
                    shouldShowFit
                      ? "text-white stroke-current"
                      : "text-blue-600 stroke-current"
                  }
                  strokeDasharray={`${shouldShowFit ? currentScore : matchScore}, 100`}
                  strokeLinecap="round"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeWidth="4"
                />
              </svg>
              <span
                className={`absolute text-[9px] font-black ${
                  shouldShowFit ? "text-white" : "text-blue-950"
                }`}
              >
                {shouldShowFit ? currentScore : matchScore}
              </span>
            </div>
          </button>
        </div>

        {/* 2. Program Details & Metrics Strip */}
        <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100 flex flex-col gap-1 max-w-full overflow-hidden">
          <div className="flex items-center justify-between gap-1 min-w-0">
            <h3 className="text-xs font-bold text-rose-600 leading-tight truncate">
              {degree}
            </h3>
            <span className="flex items-center gap-0.5 text-[9.5px] text-slate-500 shrink-0">
              <Clock size={9} className="text-slate-400" /> {duration}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1 pt-1 border-t border-slate-200/60 min-w-0">
            <div className="min-w-0">
              <p className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider truncate">
                Admission
              </p>
              <p className="text-[10px] font-bold text-slate-800 truncate">
                {admissionRate}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider truncate">
                SAT/ACT
              </p>
              <p className="text-[10px] font-bold text-slate-800 truncate">
                {satAct}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider truncate">
                Salary
              </p>
              <p className="text-[10px] font-bold text-emerald-600 truncate">
                {medianSalary ?? "N/A"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider truncate">
                Cost
              </p>
              <p className="text-[10px] font-bold text-slate-800 truncate">
                {estCost ?? "N/A"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[7.5px] font-bold uppercase text-slate-400 tracking-wider truncate">
                20yr ROI
              </p>
              <p className="text-[10px] font-bold text-blue-600 truncate">
                {roi ?? "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Mobile Action Buttons */}
        <div className="flex items-center justify-between gap-1 pt-0.5 max-w-full">
          <div className="flex items-center gap-1">
            <Button
              type={isCompared ? "primary" : "default"}
              onClick={toggleCompare}
              className={`flex items-center gap-0.5 h-6 px-2 text-[9.5px] font-bold rounded-full transition-all ${
                isCompared
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "text-slate-600 border-slate-300 hover:text-blue-600"
              }`}
              icon={
                <CompareIconAnimation active={isCompared} hovered={false} />
              }
            >
              {isCompared ? "Compared" : "Compare"}
            </Button>

            <Button
              type={isSavedCollege ? "primary" : "default"}
              onClick={handleToggleSave}
              loading={isSaving}
              className={`flex items-center gap-0.5 h-6 px-2 text-[9.5px] font-bold rounded-full transition-all ${
                isSavedCollege
                  ? "bg-rose-500 border-rose-500 text-white shadow-sm"
                  : "text-slate-600 border-slate-300 hover:text-rose-500"
              }`}
              icon={
                <Heart
                  size={10}
                  className={isSavedCollege ? "fill-current" : ""}
                />
              }
            >
              {isSavedCollege ? "Saved" : "Save"}
            </Button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {formattedSchoolUrl && (
              <a
                href={formattedSchoolUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-blue-600 text-blue-600 px-2 py-0.5 rounded-full text-[9.5px] font-bold transition text-center whitespace-nowrap"
              >
                Website
              </a>
            )}
            <Link
              href={universityHref}
              className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[9.5px] font-bold transition text-center whitespace-nowrap shadow-sm"
            >
              Details
            </Link>
          </div>
        </div>
      </div>
      )}

      {/* Profile/Fit Score Modal */}
      {showModal && (
        <UserSatPopup
          setShowModal={setShowModal}
          tempGpa={tempGpa}
          setTempGpa={setTempGpa}
          validateGpa={validateGpa}
          gpaError={gpaError}
          satError={satError}
          setTempSat={setTempSat}
          tempSat={tempSat}
          validateSat={validateSat}
          isCalculated={isCalculated}
          handleClear={handleClear}
          handleCalculate={handleCalculate}
          university={university}
          admissionRate={admissionRate}
          satAct={satAct}
          hasSatData={hasSatData}
        />
      )}
    </>
  );
}
