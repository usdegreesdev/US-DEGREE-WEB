"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import UserSatPopup from "./UserSatPopup";
import { message } from "antd";
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
import { calculateFitScore, parseAdmissionRate } from "./fitScore";
import ResultCardDesktop from "./ResultCardDesktop";
import ResultCardMobile from "./ResultCardMobile";
import type { ResultCardProps } from "./resultCardTypes";

export type { ResultCardProps } from "./resultCardTypes";

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

// No viewport on the server - default to desktop.
function getServerIsDesktop() {
  return true;
}

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
  const displayScore = shouldShowFit ? currentScore : matchScore;

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
    // Mirror the stored GPA/SAT (if any) into local state.
    const syncFromStorage = () => {
      const gpa = localStorage.getItem(FIT_GPA_KEY);
      const sat = localStorage.getItem(FIT_SAT_KEY);
      if (gpa) {
        const gpaNum = parseFloat(gpa);
        const satNum = parseInt(sat || "0") || 0;
        if (!isNaN(gpaNum)) {
          setCurrentScore(
            calculateFitScore(gpaNum, satNum, admissionRate, satAct),
          );
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

    // Post-mount sync from client-only localStorage.
    syncFromStorage();

    window.addEventListener(FIT_SCORE_EVENT, syncFromStorage);
    window.addEventListener("storage", syncFromStorage); // cross-tab / profile sync
    return () => {
      window.removeEventListener(FIT_SCORE_EVENT, syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
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

  const viewProps = {
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
    estCost,
    medianSalary,
    roi,
    logoColor,
    universityHref,
    formattedSchoolUrl,
    shouldShowFit,
    displayScore,
    isCompared,
    isSavedCollege,
    isSaving,
    onOpenFit: handleOpenFit,
    onToggleCompare: toggleCompare,
    onToggleSave: handleToggleSave,
  };

  return (
    <>
      {isDesktop ? (
        <ResultCardDesktop {...viewProps} />
      ) : (
        <ResultCardMobile {...viewProps} />
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
