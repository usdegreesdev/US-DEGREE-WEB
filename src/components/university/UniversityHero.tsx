"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Bookmark, MapPin, ExternalLink } from "lucide-react";
import { UniversityHeroProps } from "@/types/university/UniversityHero";
import { Button, message } from "antd";
import CompareIconAnimation from "../search/CompareIconAnimation";
import {
  toggleCompare as toggleCompareStore,
  useIsCollegeCompared,
  MAX_COMPARE,
} from "../compare/compareMatrixStore";
import {
  toggleSaved,
  useSavedCollege,
  reloadSaved,
  SavedLimitError,
} from "../search/useSavedColleges";
import type { SavedCollege } from "@/lib/auth/api";
import { toSafeHttpUrl } from "@/lib/url/httpUrl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { writeSaveLoginIntent } from "@/lib/saveLoginIntent";
import { usePendingSave } from "@/hooks/usePendingSave";

export default function UniversityHero({
  id,
  name,
  location,
  type,
  admissionRate,
  tuitionFee,
  logoColor,
  tuitionData,
  tuitionType = "in_state",
  schoolUrl,
  accreditor,
  cipCode,
  degree,
  credentialLevel,
  credentialTitle,
}: UniversityHeroProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Selected-for-comparison state from the single shared matrix store.
  const compareId = String(id ?? "");
  const isCompared = useIsCollegeCompared(compareId);

  const toggleCompare = async () => {
    if (!compareId) return;
    const hasCip = !!cipCode && cipCode !== "N/A" && cipCode !== "default";
    try {
      const result = await toggleCompareStore({
        unitid: compareId,
        cipCode: hasCip ? (cipCode as string) : "default",
        programName: hasCip ? degree || undefined : undefined,
        credentialLevel: hasCip ? (credentialLevel ?? undefined) : undefined,
        credentialTitle: hasCip ? (credentialTitle ?? undefined) : undefined,
        name,
        location,
        schoolType: type,
        schoolUrl: schoolUrl ?? undefined,
      });
      if (result === "full") {
        alert(
          `You can compare a maximum of ${MAX_COMPARE} programs simultaneously.`,
        );
      }
    } catch (err) {
      console.error("Failed to update comparison selection:", err);
    }
  };

  const formattedSchoolUrl = toSafeHttpUrl(schoolUrl);

  // Saved-college state (shared store; same source as the profile grid).
  const isSaved = useSavedCollege(compareId);
  const [isSaving, setIsSaving] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  // Enriched optimistic record so the Saved Colleges grid shows the card
  // instantly with a working "Visit website" link and formatted metrics.
  const buildSavedRecord = (): SavedCollege => {
    const admissionNum = parseFloat(admissionRate.replace(/[^0-9.]/g, ""));
    const hasCip = !!cipCode && cipCode !== "N/A" && cipCode !== "default";
    return {
      unitid: compareId,
      name,
      location,
      tuitionFee: tuitionData?.tuition?.tuition_in_state ?? null,
      acceptanceRate: Number.isNaN(admissionNum) ? null : admissionNum,
      createdAt: new Date().toISOString(),
      schoolUrl: formattedSchoolUrl,
      cipCode: hasCip ? cipCode : null,
      programName: hasCip ? degree || null : null,
      credentialLevel: hasCip ? (credentialLevel ?? null) : null,
      credentialTitle: hasCip ? credentialTitle || null : null,
    };
  };

  // A signed-out user who clicked Save is sent to login; once they return
  // authenticated this college saves itself, flipping the button to "saved".
  usePendingSave(user, compareId, (outcome) => {
    if ("saved" in outcome) {
      message.success(`Saved ${name} to your colleges.`);
      void reloadSaved();
    } else if (outcome.error instanceof SavedLimitError) {
      message.warning(outcome.error.message);
    } else {
      message.error("Could not update saved colleges. Please try again.");
    }
  });

  const handleToggleSave = async () => {
    if (!compareId) {
      message.error("This college can't be saved (missing identifier).");
      return;
    }
    if (!user) {
      writeSaveLoginIntent({
        url: window.location.pathname + window.location.search,
        unitid: compareId,
        record: buildSavedRecord(),
      });
      router.push("/?login=1");
      return;
    }
    setIsSaving(true);
    try {
      const record = buildSavedRecord();
      const nowSaved = await toggleSaved(compareId, record);
      if (nowSaved) {
        message.success(`Saved ${name} to your colleges.`);
        // Reconcile with the backend-enriched record once persisted.
        void reloadSaved();
      } else {
        message.info(`Removed ${name} from saved colleges.`);
      }
    } catch (err) {
      if (err instanceof SavedLimitError) {
        message.warning(err.message);
      } else {
        console.error("Failed to update saved colleges:", err);
        message.error("Could not update saved colleges. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Fallbacks if database has nulls or if tuitionData is absent
  const tuitionInState = tuitionData?.tuition?.tuition_in_state ?? 12714;
  const tuitionOutState = tuitionData?.tuition?.tuition_out_state ?? 25000;
  const bookSupply = tuitionData?.tuition?.booksupply ?? 1200;
  const roomBoardOnCampus = tuitionData?.housing?.roomboard_oncampus ?? 7348;
  const otherExpenseOnCampus =
    tuitionData?.expenses?.otherexpense_oncampus ?? 2832;

  const stickerInState =
    bookSupply + tuitionInState + roomBoardOnCampus + otherExpenseOnCampus;
  const stickerOutState =
    bookSupply + tuitionOutState + roomBoardOnCampus + otherExpenseOnCampus;

  const activeStickerVal =
    tuitionType === "in_state" ? stickerInState : stickerOutState;
  const activeStickerPrice = tuitionData
    ? `$${Math.round(activeStickerVal).toLocaleString()}`
    : tuitionFee;
  return (
    <div className="relative w-full">
      {/* Banner Cover Image */}
      <div className="h-64 md:h-[300px] w-full overflow-hidden relative">
        <Image
          src="/images/2.jpg"
          alt={`${name} campus`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"></div>
      </div>

      {/* University Info Overlay Container */}
      <div className="w-full max-w-[2380px] mx-auto px-4 sm:px-6 md:px-10 lg:px-[86px] relative">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 -mt-12 md:-mt-20 relative z-10">
          {/* Logo Card */}
          <div
            className={`w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 md:mt-12 rounded-[24px] sm:rounded-[28px] ${logoColor || "bg-[#3F51B5]"} border-4 border-white shadow-xl flex items-center justify-center text-white shrink-0 select-none font-sans`}
          >
            <span className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight drop-shadow-md">
              {name ? name.trim().charAt(0).toUpperCase() : "U"}
            </span>
          </div>

          {/* Name & Badges */}
          <div className="flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="bg-red-100 text-red-600 text-[10px] font-extrabold px-3 py-1 rounded uppercase tracking-wider">
                {type}
              </span>
              <span className="flex items-center gap-1 text-sm text-gray-500 font-medium">
                <MapPin size={14} className="text-gray-400" /> {location}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-blue-600 tracking-tight leading-tight break-words mb-1">
              {name}
            </h1>
            {accreditor && (
              <p className="text-xs md:text-sm text-slate-500 font-bold mt-1.5 uppercase tracking-wide">
                Accreditor - {accreditor}
              </p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between py-6 mt-4 border-b border-gray-200 gap-5">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 sm:gap-8 md:gap-12 w-full">
            {/* <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rank</p>
              <p className="text-xl font-black text-red-600">{rank}</p>
            </div> */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Admission Rate
              </p>
              <p className="text-xl font-black text-gray-900">
                {admissionRate}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Tuition Fee
              </p>
              <p className="text-xl font-black text-gray-900">
                {activeStickerPrice}
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto mt-4 md:mt-0">
            <div className="flex flex-col sm:flex-row md:flex-nowrap gap-3 font-medium">
              {formattedSchoolUrl && (
                <a
                  href={formattedSchoolUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition shadow-sm w-full md:w-fit whitespace-nowrap"
                >
                  <ExternalLink size={16} />
                  Visit Website
                </a>
              )}

              <div className="grid grid-cols-2 gap-3 w-full md:flex md:w-auto md:items-center">
                <button
                  onClick={handleToggleSave}
                  disabled={isSaving}
                  className={`flex items-center justify-center gap-1.5 h-10 px-4 rounded-full border text-sm font-medium transition w-full md:w-auto disabled:opacity-60 ${
                    isSaved
                      ? "bg-rose-400 border-rose-400 text-white hover:bg-rose-500 hover:border-rose-500"
                      : "border-gray-300 text-gray-600 hover:text-rose-400 hover:border-rose-400"
                  }`}
                >
                  <Bookmark
                    size={16}
                    className={isSaved ? "fill-current" : ""}
                  />
                  {isSaved ? "Saved" : "Save"}
                </button>

                <Button
                  type={isCompared ? "primary" : "default"}
                  onClick={toggleCompare}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className={`!h-10 !px-4 sm:!px-5 !rounded-full !text-xs sm:!text-sm !font-semibold transition-all duration-300 w-full md:w-auto flex items-center justify-center ${
                    isCompared
                      ? "!bg-blue-600 !border-blue-600 !text-white hover:!bg-blue-700 hover:!border-blue-700 shadow-md"
                      : "!text-gray-600 !border-gray-300 hover:!text-blue-600 hover:!border-blue-600"
                  }`}
                  icon={
                    <CompareIconAnimation
                      active={isCompared}
                      hovered={isHovered}
                    />
                  }
                >
                  {isCompared ? "Added" : "Compare"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
