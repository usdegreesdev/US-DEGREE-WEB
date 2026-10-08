import { ApiError } from "./apiError";

/**
 * An error whose message was written by this app, for the user, at the throw
 * site. It is the only kind of Error whose message may be displayed: anything
 * else (Firebase, fetch, the backend, a thrown string) is mapped by code or
 * replaced with GENERIC_AUTH_ERROR. Never construct one from external text.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export const GENERIC_AUTH_ERROR =
  "Something went wrong signing you in. Please try again.";

// Firebase codes -> copy. wrong-password / user-not-found / invalid-credential
// share ONE message so a response can't be used to tell which emails have
// accounts.
const INVALID_LOGIN = "Invalid email address or password.";
const FIREBASE_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": INVALID_LOGIN,
  "auth/wrong-password": INVALID_LOGIN,
  "auth/user-not-found": INVALID_LOGIN,
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/email-already-in-use":
    "This email address is already in use by another account.",
  "auth/weak-password": "The password must be at least 6 characters.",
  "auth/too-many-requests":
    "Too many failed attempts. Please try again later.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/popup-blocked":
    "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  "auth/user-disabled":
    "This account has been disabled. Please contact support.",
  "auth/requires-recent-login":
    "For security, please sign out and back in, then try again.",
  "auth/account-exists-with-different-credential":
    "An account with this email already exists using a different sign-in method. Try signing in another way.",
};

// Backend codes (`error.code` of its error envelope) -> copy. Every code the
// backend defines is listed; an unlisted (future) code falls through to the
// status mapping, then GENERIC_AUTH_ERROR.
const SESSION_EXPIRED = "Your session has expired. Please sign in again.";
const TRY_AGAIN = "Too many requests. Please wait a moment and try again.";
const BACKEND_MESSAGES: Record<string, string> = {
  // Expired tokens are normally re-exchanged and retried silently by
  // authedFetch; this copy only shows if the retry also failed.
  AUTH_TOKEN_MISSING: SESSION_EXPIRED,
  AUTH_TOKEN_INVALID: SESSION_EXPIRED,
  AUTH_TOKEN_EXPIRED: SESSION_EXPIRED,
  AUTH_USER_DISABLED: "This account has been disabled. Please contact support.",
  AUTH_EXCHANGE_FAILED: "We couldn't sign you in. Please try again.",
  PROFILE_INVALID:
    "Some of the information provided isn't valid. Please check it and try again.",
  EMAIL_ALREADY_IN_USE:
    "This email address is already in use by another account.",
  EMAIL_IN_COOLDOWN:
    "This email address can't be used right now. Please try again later.",
  CURRENT_EMAIL_NOT_VERIFIED:
    "Please verify your current email address before changing it.",
  RATE_LIMITED: TRY_AGAIN,
  NOT_FOUND: "We couldn't find what you were looking for.",
  FORBIDDEN: "You don't have permission to do that.",
  INVALID_REQUEST:
    "That request wasn't valid. Please check your input and try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
};

/** Copy for a backend error code, or undefined when the code isn't mapped. */
export function backendMessageFor(code: string | undefined): string | undefined {
  return code ? BACKEND_MESSAGES[code] : undefined;
}

// Statuses with a message that is true whatever the code.
const STATUS_MESSAGES: Record<number, string> = {
  429: TRY_AGAIN,
};

/**
 * Machine-readable code of an unknown thrown value, or "". Reads `.code` (and
 * Apple's `.error`) only — never `.message`, so message text can't influence
 * which copy is chosen.
 */
function readCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const { code, error: appleError } = error as {
    code?: unknown;
    error?: unknown;
  };
  if (typeof code === "string") return code;
  if (typeof appleError === "string") return appleError;
  return "";
}

const CANCELLED_POPUP_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
  // Sign in with Apple JS
  "popup_closed_by_user",
  "user_cancelled_authorize",
]);

export function isCancelledPopupError(error: unknown): boolean {
  return CANCELLED_POPUP_CODES.has(readCode(error));
}

export interface FriendlyError {
  message: string;
  /** Backend request id, for support. Shown as "Ref: <id>". */
  requestId?: string;
}

/**
 * Turn anything thrown into copy that is safe to show. Total over `unknown`:
 * a string, a plain Error or a non-Error object all get the generic message.
 * The raw error is logged outside production only and never reaches the UI.
 */
export function getFriendlyError(error: unknown): FriendlyError {
  if (process.env.NODE_ENV !== "production") {
    console.error("[auth] raw error:", error);
  }

  if (error instanceof UserFacingError) return { message: error.message };

  if (error instanceof ApiError) {
    const message =
      backendMessageFor(error.code) ||
      STATUS_MESSAGES[error.status] ||
      GENERIC_AUTH_ERROR;
    return { message, requestId: error.requestId };
  }

  return { message: FIREBASE_MESSAGES[readCode(error)] ?? GENERIC_AUTH_ERROR };
}

/** Same as getFriendlyError, as one string ("... (Ref: id)") for plain-text UIs. */
export function getFriendlyErrorMessage(error: unknown): string {
  const { message, requestId } = getFriendlyError(error);
  return requestId ? `${message} (Ref: ${requestId})` : message;
}

/**
 * Copy for GET /account/email-available when it answers 200 with
 * `{ available: false, code, details }`. That is not an error envelope, and
 * `details` is backend text, so only `code` is used.
 */
export function unavailableEmailMessage(code: string | undefined): string {
  return (
    backendMessageFor(code) ?? "This email address can't be used right now."
  );
}
