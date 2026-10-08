/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { message, notification } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import React from "react";
import {
  updatePassword,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase";
import {
  fetchProfile,
  patchProfile,
  deleteAccount,
  checkEmailAvailable,
  type DeactivationPayload,
} from "../../lib/auth/api";
import { clearAppJwt } from "../../lib/auth/tokenStore";
import { unavailableEmailMessage } from "../../lib/auth/authErrors";
import {
  FIT_SCORE_EVENT,
  readFitStats,
  writeFitStats,
  hasFitStats,
} from "../../lib/fitScoreSync";
import { StudentProfile } from "../../types/profile";
import { useCollegeMatches } from "./matchEngine";
import {
  emptyProfile,
  mergeProfile,
  toProfilePatch,
  getAuthErrorMessage,
  type ProfileAuthUser,
} from "./profileUtils";

/**
 * How the signed-in Firebase user must reauthenticate before a sensitive
 * operation (e.g. changing their email). Derived from the Firebase user's
 * linked providers, never from client-submitted form data.
 */
export type ReauthMethod = "password" | "google" | "unsupported";

/**
 * Thrown when the backend's email-availability pre-check rejects the entered
 * new email (already in use / in cooldown / current email unverified). Kept
 * distinct from other handleEmailSubmit failures so the modal can surface it
 * as an inline field error instead of a generic toast.
 */
export class EmailAvailabilityError extends Error {}

function getReauthMethod(user: FirebaseUser | null): ReauthMethod {
  if (!user) return "unsupported";
  const providerIds = user.providerData.map((p) => p.providerId);
  if (providerIds.includes("password")) return "password";
  if (providerIds.includes("google.com")) return "google";
  return "unsupported";
}

/**
 * Custom hook to manage state, synchronization, and backend operations for ProfileDashboard.
 */
export function useProfileDashboard(authUser?: ProfileAuthUser | null) {
  // 1. Primary Profile State
  const [profile, setProfile] = useState<StudentProfile>(() =>
    emptyProfile(authUser),
  );
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Latest profile reference for safe event handler access
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Ref to prevent infinite sync loops with fit-score store
  const suppressFitSync = useRef(false);

  // 2. Fetch User Profile on Mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchProfile<Record<string, unknown>>();
        if (!active || !data) return;
        const merged = mergeProfile(profileRef.current, data);

        if (hasFitStats()) {
          const { gpa, sat } = readFitStats();
          const reconciled = {
            ...merged,
            gpa: gpa != null ? gpa : merged.gpa,
            satScore: sat != null ? sat : merged.satScore,
          };
          setProfile(reconciled);

          const patch: Record<string, unknown> = {};
          if (reconciled.gpa !== merged.gpa) patch.gpa = reconciled.gpa;
          if (reconciled.satScore !== merged.satScore)
            patch.satScore = reconciled.satScore;
          if (Object.keys(patch).length > 0) {
            patchProfile<Record<string, unknown>>(patch).catch((err) =>
              console.error("Failed to sync fit score to profile:", err),
            );
          }
        } else {
          setProfile(merged);
          if (merged.gpa != null) {
            suppressFitSync.current = true;
            writeFitStats(merged.gpa, merged.satScore);
            suppressFitSync.current = false;
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (active) setIsProfileLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // 3. Listen for Fit Score Updates (from search page result cards)
  useEffect(() => {
    const applyFromStore = () => {
      if (suppressFitSync.current) return;
      const { gpa, sat } = readFitStats();
      const prev = profileRef.current;
      const nextGpa = gpa != null ? gpa : prev.gpa;
      const nextSat = sat != null ? sat : prev.satScore;
      if (nextGpa === prev.gpa && nextSat === prev.satScore) return;

      setProfile({ ...prev, gpa: nextGpa, satScore: nextSat });

      const patch: Record<string, unknown> = {};
      if (nextGpa !== prev.gpa) patch.gpa = nextGpa;
      if (nextSat !== prev.satScore) patch.satScore = nextSat;
      if (Object.keys(patch).length > 0) {
        patchProfile<Record<string, unknown>>(patch).catch((err) =>
          console.error("Failed to sync fit score to profile:", err),
        );
      }
    };

    window.addEventListener(FIT_SCORE_EVENT, applyFromStore);
    window.addEventListener("storage", applyFromStore);
    return () => {
      window.removeEventListener(FIT_SCORE_EVENT, applyFromStore);
      window.removeEventListener("storage", applyFromStore);
    };
  }, []);

  // 4. View & Modal Control States
  const [savedCollegesView, setSavedCollegesView] = useState<"Grid" | "List">(
    "Grid",
  );
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [changeEmailReauthMethod, setChangeEmailReauthMethod] =
    useState<ReauthMethod>("password");
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [accountDeactivatedStatus, setAccountDeactivatedStatus] =
    useState(false);

  // College Matches matching engine hook
  const { matches, loading: matchesLoading } = useCollegeMatches(profile);

  // 5. Action Handlers
  const onProfileSave = async (
    values: Omit<StudentProfile, "createdDate" | "lastLogin">,
  ) => {
    const patch = toProfilePatch(profile, values);
    if (Object.keys(patch).length === 0) {
      setIsEditProfileOpen(false);
      return;
    }

    try {
      const updated = await patchProfile<Record<string, unknown>>(patch);
      const merged = mergeProfile(profile, updated ?? patch);
      setProfile(merged);
      setIsEditProfileOpen(false);

      if ("gpa" in patch || "satScore" in patch) {
        suppressFitSync.current = true;
        writeFitStats(merged.gpa, merged.satScore);
        suppressFitSync.current = false;
      }

      message.success("Academic profile and preferences updated successfully!");
    } catch (err) {
      console.error("Profile save failed:", err);
      message.error("Could not save your profile. Please try again.");
    }
  };

  const handlePasswordSubmit = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    const current = auth?.currentUser ?? null;
    if (!current || !current.email) {
      message.error("You must be signed in to change your password.");
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      message.error("The passwords do not match!");
      return;
    }

    try {
      try {
        await updatePassword(current, values.newPassword);
      } catch (err) {
        if ((err as { code?: string }).code === "auth/requires-recent-login") {
          const credential = EmailAuthProvider.credential(
            current.email,
            values.currentPassword,
          );
          await reauthenticateWithCredential(current, credential);
          await updatePassword(current, values.newPassword);
        } else {
          throw err;
        }
      }

      setIsChangePasswordOpen(false);
      notification.success({
        title: "Password Updated",
        description:
          "Your account security credentials have been updated successfully.",
        icon: React.createElement(CheckCircleOutlined, {
          style: { color: "#52c41a" },
        }),
      });
    } catch (err) {
      console.error("Password change failed:", err);
      message.error(
        getAuthErrorMessage(err, "Could not update your password."),
      );
    }
  };

  const openChangeEmailModal = () => {
    setChangeEmailReauthMethod(getReauthMethod(auth?.currentUser ?? null));
    setIsChangeEmailOpen(true);
  };

  const handleEmailSubmit = async (values: {
    newEmail: string;
    currentPassword: string;
  }) => {
    const current = auth?.currentUser ?? null;
    if (!current || !current.email) {
      message.error("You must be signed in to change your email.");
      return;
    }
    if (!current.emailVerified) {
      message.error(
        "You must verify your current email address before changing it.",
      );
      return;
    }

    // Reauthentication is mandatory and must succeed *before* we ever call
    // verifyBeforeUpdateEmail — do not rely on Firebase's own
    // auth/requires-recent-login error to trigger it, since Firebase may
    // consider the existing session "recent enough" and skip that error
    // entirely, letting a fabricated password field through unchecked.
    const reauthMethod = getReauthMethod(current);
    if (reauthMethod === "password") {
      if (!values.currentPassword) {
        message.error("Please enter your current password.");
        return;
      }
      try {
        const credential = EmailAuthProvider.credential(
          current.email,
          values.currentPassword,
        );
        await reauthenticateWithCredential(current, credential);
      } catch (err) {
        console.error("Reauthentication failed:", err);
        message.error(
          getAuthErrorMessage(err, "Current password is incorrect."),
        );
        return;
      }
    } else if (reauthMethod === "google") {
      try {
        await reauthenticateWithPopup(current, googleProvider);
      } catch (err) {
        console.error("Reauthentication failed:", err);
        message.error(
          getAuthErrorMessage(
            err,
            "Reauthentication failed. Please try again.",
          ),
        );
        return;
      }
    } else {
      message.error(
        "Reauthentication isn't supported for this sign-in method yet. Please contact support to change your email address.",
      );
      return;
    }

    // Pre-check the new email against the backend's ownership/cooldown rules
    // before ever sending a Firebase verification link — Firebase's own
    // uniqueness check has no idea about this app's deactivation cooldown, so
    // without this a doomed-to-conflict change would still get a "check your
    // email" success state. This is UX only: the backend re-validates the
    // same conditions independently when the change is finalized, so a
    // failed/skipped pre-check here can't put an account in a bad state.
    try {
      const availability = await checkEmailAvailable(values.newEmail);
      if (!availability.available) {
        // Fixed copy keyed on the backend's code; `details` is backend text
        // and is not shown.
        throw new EmailAvailabilityError(
          unavailableEmailMessage(availability.code),
        );
      }
    } catch (err) {
      if (err instanceof EmailAvailabilityError) throw err;
      console.error("Email availability pre-check failed:", err);
    }

    try {
      await verifyBeforeUpdateEmail(current, values.newEmail);

      setIsChangeEmailOpen(false);
      notification.success({
        title: "Verification link sent",
        description: `We sent a confirmation link to ${values.newEmail}. Your email updates after you click it.`,
        icon: React.createElement(CheckCircleOutlined, {
          style: { color: "#52c41a" },
        }),
      });
    } catch (err) {
      console.error("Email change failed:", err);
      message.error(
        getAuthErrorMessage(err, "Could not start the email change."),
      );
    }
  };

  const onConfirmDeactivate = async (payload: DeactivationPayload) => {
    try {
      await deleteAccount(payload);
    } catch (err) {
      console.error("Account deletion failed:", err);
      message.error("We couldn't deactivate your account. Please try again.");
      return;
    }

    setIsDeactivateOpen(false);
    setAccountDeactivatedStatus(true);

    try {
      if (auth) await signOut(auth);
    } catch (err) {
      console.error("Sign-out after deletion failed:", err);
    }
    clearAppJwt();
  };

  return {
    profile,
    isProfileLoading,
    savedCollegesView,
    setSavedCollegesView,
    isEditProfileOpen,
    setIsEditProfileOpen,
    isChangePasswordOpen,
    setIsChangePasswordOpen,
    isChangeEmailOpen,
    setIsChangeEmailOpen,
    changeEmailReauthMethod,
    openChangeEmailModal,
    isDeactivateOpen,
    setIsDeactivateOpen,
    accountDeactivatedStatus,
    matches,
    matchesLoading,
    onProfileSave,
    handlePasswordSubmit,
    handleEmailSubmit,
    onConfirmDeactivate,
  };
}
