/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

"use client";

import React, { Suspense } from "react";
import { Result, Row, Col } from "antd";

import ProfileInfoCard from "./cards/ProfileInfoCard";
import AcademicInfoCard from "./cards/AcademicInfoCard";
import PreferencesCard from "./cards/PreferencesCard";
import CollegeMatchesSection from "./cards/CollegeMatchesSection";
import SavedCollegesSection from "./cards/SavedCollegesSection";
import AppliedListSection from "./cards/AppliedListSection";
import MyReportsSection from "./cards/MyReportsSection";
import DangerZoneCard from "./cards/DangerZoneCard";

import EditProfileModal from "./modals/EditProfileModal";
import ChangePasswordModal from "./modals/ChangePasswordModal";
import ChangeEmailModal from "./modals/ChangeEmailModal";
import DeactivateAccountModal from "./modals/DeactivateAccountModal";

import CompleteProfileAlert from "./CompleteProfileAlert";
import CheckoutSuccessBanner from "./CheckoutSuccessBanner";
import { useBilling } from "@/context/BillingContext";
import { creditsLabel, formatDate, formatMoney } from "@/lib/billing";
import { useProfileDashboard } from "./useProfileDashboard";
import {
  emptyProfile,
  isProfileEmpty,
  mergeProfile,
  type ProfileAuthUser,
} from "./profileUtils";

// Re-export helper functions used elsewhere for backwards compatibility
export { emptyProfile, mergeProfile };

interface ProfileDashboardProps {
  authUser?: ProfileAuthUser | null;
}

/**
 * Main Student Profile Dashboard view component.
 */
export default function ProfileDashboard({ authUser }: ProfileDashboardProps) {
  const {
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
  } = useProfileDashboard(authUser);
  const { credits, payments, isMember } = useBilling();

  // Render Deactivated Account View
  if (accountDeactivatedStatus) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Result
          status="warning"
          title="Profile Deactivated Successfully"
          subTitle="In accordance with your preferences, your U.S. Degrees Counsel account data has been marked for deactivation. Your profile will not appear in our matchmaking metrics."
        />
      </div>
    );
  }

  return (
    <div
      id="student_profile_dashboard_page"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12"
    >
      {/* Shown once after Stripe Checkout returns (?checkout=success&session_id=...) */}
      <Suspense fallback={null}>
        <CheckoutSuccessBanner />
      </Suspense>

      {/* Complete Profile prompt for new users */}
      {isProfileEmpty(profile) && (
        <CompleteProfileAlert onOpenEdit={() => setIsEditProfileOpen(true)} />
      )}

      {/* Main Grid: Student Info, Academic Info & Preferences */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <ProfileInfoCard
            profile={profile}
            loading={isProfileLoading}
            onEdit={() => setIsEditProfileOpen(true)}
            onChangePassword={() => setIsChangePasswordOpen(true)}
            onChangeEmail={openChangeEmailModal}
          />
        </Col>

        <Col xs={24} lg={10}>
          <div className="flex flex-col gap-6 h-full justify-between">
            <AcademicInfoCard
              profile={profile}
              loading={isProfileLoading}
              onEdit={() => setIsEditProfileOpen(true)}
            />
            <PreferencesCard
              profile={profile}
              loading={isProfileLoading}
              onEdit={() => setIsEditProfileOpen(true)}
            />
          </div>
        </Col>
      </Row>

      {/* Match Engine Recommendations */}
      <div>
        <CollegeMatchesSection matches={matches} loading={matchesLoading} />
      </div>

      {/* Saved Colleges + Applied List, side by side on wide screens and
          stacked below xl (the applied table needs the room). */}
      <div>
        <Row gutter={[24, 24]} align="stretch">
          <Col xs={24} xl={12}>
            <SavedCollegesSection
              view={savedCollegesView}
              onViewChange={setSavedCollegesView}
            />
          </Col>
          <Col xs={24} xl={12}>
            <AppliedListSection />
          </Col>
        </Row>
      </div>

      {/* Generated Reports */}
      <div>
        <MyReportsSection />
      </div>

      {/* Billing & Credits — only for users who have paid; free users see no change. */}
      {isMember && payments && (
        <section id="subscription" className="scroll-mt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-neutral-900">Billing &amp; Credits</h2>
            {credits !== null && (
              <span className="text-sm text-gray-600">Balance: {creditsLabel(credits)}</span>
            )}
          </div>
          <ul className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-100 bg-white">
            {payments.map((p) => (
              <li
                key={p.sessionId}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
              >
                <span className="font-medium text-neutral-800">
                  {p.packName} · {creditsLabel(p.credits)}
                </span>
                <span className="flex items-center gap-4 text-gray-600">
                  <span>{formatDate(p.createdAt, "short")}</span>
                  <span>{formatMoney(p.amountCents, p.currency)}</span>
                  {p.receiptUrl && (
                    <a
                      href={p.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-action hover:text-action-hover"
                    >
                      Receipt
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Danger Zone */}
      <div>
        <DangerZoneCard onDeactivate={() => setIsDeactivateOpen(true)} />
      </div>

      {/* Profile & Security Modals */}
      <EditProfileModal
        open={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        profile={profile}
        onSave={onProfileSave}
      />
      <ChangePasswordModal
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onSubmit={handlePasswordSubmit}
      />
      <ChangeEmailModal
        open={isChangeEmailOpen}
        onClose={() => setIsChangeEmailOpen(false)}
        currentEmail={profile.email}
        reauthMethod={changeEmailReauthMethod}
        onSubmit={handleEmailSubmit}
      />
      <DeactivateAccountModal
        open={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        onConfirm={onConfirmDeactivate}
      />
    </div>
  );
}
