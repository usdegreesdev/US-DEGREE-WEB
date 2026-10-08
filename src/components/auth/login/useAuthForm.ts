"use client";

import React, { useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import {
  getFriendlyError,
  getFriendlyErrorMessage,
  isCancelledPopupError,
} from "@/lib/auth/authErrors";
import type { AuthMode, AuthModalMode } from "@/types/auth";

const EMAIL_REGEX = /\S+@\S+\.\S+/;
const VERIFICATION_POLL_INTERVAL_MS = 3000;
const REMEMBER_ME_KEY = "auth_remembered_credentials";

interface RememberedCredentials {
  email: string;
}

// Reads the remembered-email record, migrating away from an older format
// that stored `password` alongside it in plaintext: any stored password is
// dropped and the key rewritten email-only on first read after this change.
function loadRememberedCredentials(): RememberedCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REMEMBER_ME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<
      RememberedCredentials & { password: string }
    >;
    if (!parsed?.email) {
      localStorage.removeItem(REMEMBER_ME_KEY);
      return null;
    }
    if ("password" in parsed) {
      saveRememberedCredentials(parsed.email);
    }
    return { email: parsed.email };
  } catch {
    return null;
  }
}

function saveRememberedCredentials(email: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({ email }));
}

function clearRememberedCredentials() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REMEMBER_ME_KEY);
}

interface UseAuthFormParams {
  isOpen: boolean;
  initialMode: AuthMode;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export function useAuthForm({
  isOpen,
  initialMode,
  onClose,
  onSuccess,
}: UseAuthFormParams) {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setErrorText] = useState("");
  // Backend request id for the current error, shown as a small "Ref: <id>".
  const [errorRef, setErrorRef] = useState("");
  // Plain-text setter: clears any stale Ref along with the message.
  const setError = (message: string) => {
    setErrorText(message);
    setErrorRef("");
  };
  // Set the error from anything thrown; only mapped copy reaches the UI.
  const showError = (err: unknown) => {
    const { message, requestId } = getFriendlyError(err);
    setErrorText(message);
    setErrorRef(requestId ?? "");
  };
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [ageConsent, setAgeConsent] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const {
    login,
    signup,
    loginWithGoogle,
    loginWithApple,
    resendVerificationForUnverifiedUser,
    checkVerificationStatus,
    sendPasswordReset,
  } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset the form to a clean state whenever the modal transitions to open.
  // Done during render (not in an effect) to avoid cascading re-renders.
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setMode(initialMode);
      setError("");
      setName("");
      const remembered =
        initialMode === "login" ? loadRememberedCredentials() : null;
      setEmail(remembered?.email ?? "");
      setPassword("");
      setRememberMe(!!remembered);
      setConfirmPassword("");
      setIsParent(false);
      setAgeConsent(false);
      setIsVerificationSent(false);
      setVerificationEmail("");
      setIsResending(false);
      setResendStatus("");
      setResetSent(false);
    }
  }

  // Poll verification status if pending verification
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && isVerificationSent) {
      interval = setInterval(async () => {
        try {
          const verified = await checkVerificationStatus();
          if (verified) {
            onSuccess(verificationEmail);
            onClose();
          }
        } catch (e) {
          console.error("Error checking verification status:", e);
        }
      }, VERIFICATION_POLL_INTERVAL_MS);
    }
    return () => clearInterval(interval);
  }, [
    isOpen,
    isVerificationSent,
    checkVerificationStatus,
    verificationEmail,
    onSuccess,
    onClose,
  ]);

  useEscapeKey(isOpen, onClose);
  useBodyScrollLock(isOpen);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    const cleanName = name.trim();

    if (mode === "forgot_password") {
      if (!cleanEmail) {
        setError("Email address is required");
        return;
      }
      if (!EMAIL_REGEX.test(cleanEmail)) {
        setError("Please enter a valid email address");
        return;
      }
      setIsLoading(true);
      try {
        await sendPasswordReset(cleanEmail);
        setResetSent(true);
      } catch (err) {
        showError(err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Common Validation
    if (mode === "signup" && !cleanName) {
      setError("Full Name is required");
      return;
    }
    if (!cleanEmail) {
      setError("Email address is required");
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (mode === "signup" && !ageConsent) {
      setError("You must confirm you are 18 or older to continue");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        await login(cleanEmail, password, rememberMe);
        if (rememberMe) {
          saveRememberedCredentials(cleanEmail);
        } else {
          clearRememberedCredentials();
        }
        onSuccess(cleanEmail);
        onClose();
      } else {
        await signup(
          cleanEmail,
          password,
          cleanName,
          isParent ? "parent" : "student",
          ageConsent,
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message === "EMAIL_NOT_VERIFIED") {
        setVerificationEmail(cleanEmail);
        setIsVerificationSent(true);
      } else {
        showError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    // First-time sign-up via Google/Apple must clear the same 18+ gate as
    // email signup, before Firebase is ever called. Returning users sign in
    // from the Login tab, where no account is being created.
    if (mode === "signup" && !ageConsent) {
      setError("You must confirm you are 18 or older to continue");
      return;
    }
    setIsLoading(true);
    try {
      const firebaseUser = await loginWithGoogle(
        mode === "signup" ? ageConsent : undefined,
      );
      onSuccess(firebaseUser.email!);
      onClose();
    } catch (err) {
      if (!isCancelledPopupError(err)) {
        showError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (isLoading) return;
    if (mode === "signup" && !ageConsent) {
      setError("You must confirm you are 18 or older to continue");
      return;
    }
    setIsLoading(true);
    try {
      const appleUser = await loginWithApple(
        mode === "signup" ? ageConsent : undefined,
      );
      onSuccess(appleUser.email ?? "");
      onClose();
    } catch (err) {
      if (!isCancelledPopupError(err)) {
        showError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendStatus("");
    try {
      await resendVerificationForUnverifiedUser(verificationEmail, password);
      setResendStatus("Verification email resent successfully!");
    } catch (err) {
      setResendStatus(getFriendlyErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  return {
    mode,
    setMode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    error,
    errorRef,
    setError,
    isLoading,
    rememberMe,
    setRememberMe,
    isParent,
    setIsParent,
    ageConsent,
    setAgeConsent,
    isVerificationSent,
    setIsVerificationSent,
    verificationEmail,
    isResending,
    resendStatus,
    resetSent,
    setResetSent,
    modalRef,
    handleOverlayClick,
    handleAuthSubmit,
    handleGoogleSignIn,
    handleAppleSignIn,
    handleResendVerification,
  };
}

export type AuthFormState = ReturnType<typeof useAuthForm>;
