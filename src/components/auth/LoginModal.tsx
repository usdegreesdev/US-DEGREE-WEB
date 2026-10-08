"use client";

import { useAuthForm } from "./login/useAuthForm";
import AuthModalShell from "./login/AuthModalShell";
import AuthModalHeader from "./login/AuthModalHeader";
import AuthModeTabs from "./login/AuthModeTabs";
import SocialAuthButtons from "./login/SocialAuthButtons";
import SignupFields from "./login/SignupFields";
import LoginFields from "./login/LoginFields";
import ForgotPasswordFields from "./login/ForgotPasswordFields";
import AuthConsentRow from "./login/AuthConsentRow";
import AuthSubmitButton from "./login/AuthSubmitButton";
import AuthModalFooter from "./login/AuthModalFooter";
import VerificationSentView from "./login/VerificationSentView";
import type { AuthMode } from "@/types/auth";

interface LoginModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export default function LoginModal({
  isOpen,
  initialMode = "login",
  onClose,
  onSuccess,
}: LoginModalProps) {
  const form = useAuthForm({ isOpen, initialMode, onClose, onSuccess });

  if (!isOpen) return null;

  if (form.isVerificationSent) {
    return <VerificationSentView form={form} onClose={onClose} />;
  }

  const selectMode = (mode: "login" | "signup") => {
    form.setMode(mode);
    form.setError("");
  };

  const isForgotPassword = form.mode === "forgot_password";

  return (
    <AuthModalShell
      modalRef={form.modalRef}
      onOverlayClick={form.handleOverlayClick}
      onClose={onClose}
    >
      <AuthModalHeader mode={form.mode} resetSent={form.resetSent} />

      {!isForgotPassword && (
        <AuthModeTabs mode={form.mode} onSelect={selectMode} />
      )}

      {!isForgotPassword && (
        <SocialAuthButtons
          onGoogleSignIn={form.handleGoogleSignIn}
          onAppleSignIn={form.handleAppleSignIn}
        />
      )}

      <form onSubmit={form.handleAuthSubmit} className="space-y-4">
        {form.error && (
          <div className="bg-rose-50 border border-rose-100 text-xs text-rose-600 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
            <span>
              {form.error}
              {form.errorRef && (
                <span className="block text-[10px] font-medium opacity-70">
                  Ref: {form.errorRef}
                </span>
              )}
            </span>
          </div>
        )}

        {form.mode === "signup" ? (
          <SignupFields form={form} />
        ) : isForgotPassword ? (
          <ForgotPasswordFields form={form} />
        ) : (
          <LoginFields form={form} />
        )}

        {!isForgotPassword && (
          <AuthConsentRow
            mode={form.mode}
            rememberMe={form.rememberMe}
            onRememberChange={form.setRememberMe}
          />
        )}

        {form.mode === "login" && (
          <div className="flex items-center gap-2 pl-1 select-none">
            <input
              id="social-age-consent-checkbox"
              type="checkbox"
              checked={form.ageConsent}
              onChange={(e) => {
                form.setAgeConsent(e.target.checked);
                form.setError("");
              }}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor="social-age-consent-checkbox"
              className="text-xs font-bold text-slate-500 cursor-pointer"
            >
              I confirm that I am 18 years of age or older.
            </label>
          </div>
        )}

        {!isForgotPassword && (
          <AuthSubmitButton mode={form.mode} isLoading={form.isLoading} />
        )}
      </form>

      {!isForgotPassword && (
        <AuthModalFooter mode={form.mode} onSelect={selectMode} />
      )}
    </AuthModalShell>
  );
}
