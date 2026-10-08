"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";

const FEEDBACK_TIMEOUT_MS = 5000;
const VERIFICATION_POLL_INTERVAL_MS = 5000;

export function useEmailVerification() {
  const { user, resendVerificationEmail, checkVerificationStatus } = useAuth();

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState("");

  const handleResendEmail = async () => {
    setResending(true);
    setResendError("");
    try {
      await resendVerificationEmail();
      setResent(true);
      setTimeout(() => setResent(false), FEEDBACK_TIMEOUT_MS);
    } catch (err) {
      // Matched on the Firebase error code, never on message text.
      const code = (err as { code?: unknown } | null)?.code;
      if (code === "auth/too-many-requests") {
        setResendError(
          "Please wait a minute before requesting another verification email.",
        );
      } else {
        setResendError(
          "Failed to resend verification email. Please try again.",
        );
      }
      setTimeout(() => setResendError(""), FEEDBACK_TIMEOUT_MS);
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (user && !user.emailVerified) {
      const interval = setInterval(async () => {
        try {
          await checkVerificationStatus();
        } catch (e) {
          console.error("Background check failed:", e);
        }
      }, VERIFICATION_POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [user, checkVerificationStatus]);

  return { resending, resent, resendError, handleResendEmail };
}
