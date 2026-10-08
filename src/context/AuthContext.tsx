"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { notification } from "antd";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  signInWithCustomToken,
  deleteUser,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

const NOT_CONFIGURED_MESSAGE = "Sign-in is not configured.";
import { clearAppJwt } from "@/lib/auth/tokenStore";
import { signInWithApple } from "@/lib/appleAuth";
import { exchangeAppleIdToken } from "@/lib/auth/api";
import { UserFacingError, backendMessageFor } from "@/lib/auth/authErrors";
import { readApiError, type ApiError } from "@/lib/auth/apiError";
import { syncCompareMatrixOwner } from "@/components/compare/compareMatrixStore";
import { syncFitStatsOwner } from "@/lib/fitScoreSync";

export interface AuthUser {
  id?: number;
  displayName: string | null;
  email: string | null;
  photoURL?: string | null;
  role?: string;
  authProvider: "credentials" | "firebase" | "apple";
  emailVerified: boolean;
  createdAt?: string | null;
  lastLogin?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<AuthUser>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    role?: string,
    ageConsent?: boolean,
  ) => Promise<AuthUser>;
  loginWithGoogle: (ageConsent?: boolean) => Promise<FirebaseUser>;
  loginWithApple: (ageConsent?: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  checkVerificationStatus: () => Promise<boolean>;
  resendVerificationForUnverifiedUser: (
    email: string,
    password: string,
  ) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

// POST /user now requires a verified Firebase identity — the backend derives
// email/role/verification status from the token itself (via
// firebaseAuth.verifyIdToken(), including revocation checks) rather than
// trusting those fields in the body, so callers must attach a Firebase ID
// token and must NOT send `email` in the body. On a 401 (expired/invalid/
// revoked token) we force a fresh token from Firebase and retry once, same
// as any other Firebase-auth expiry.
async function syncUserRecord(
  firebaseUser: FirebaseUser,
  fields: Record<string, unknown>,
): Promise<Response> {
  const run = async (forceRefresh: boolean) => {
    const idToken = await firebaseUser.getIdToken(forceRefresh);
    return fetch("/api/proxy/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(fields),
    });
  };

  let res = await run(false);
  if (res.status === 401) {
    res = await run(true);
  }
  return res;
}

function providerFor(u: FirebaseUser): "credentials" | "apple" | "google" {
  if (u.providerData.some((p) => p.providerId === "password")) {
    return "credentials";
  }
  if (u.providerData.some((p) => p.providerId === "apple.com")) return "apple";
  return "google";
}

// A backend error is shown as-is only when its code (or 429) has copy of ours
// (e.g. AGE_CONSENT_REQUIRED); anything else uses the caller's own fallback.
function isDisplayable(e: ApiError): boolean {
  return Boolean(backendMessageFor(e.code)) || e.status === 429;
}

async function syncError(res: Response, fallback: string): Promise<Error> {
  const e = await readApiError(res, "Sync account");
  return isDisplayable(e) ? e : new UserFacingError(fallback);
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {
    throw new Error("AuthContext not initialized");
  },
  signup: async () => {
    throw new Error("AuthContext not initialized");
  },
  loginWithGoogle: async () => {
    throw new Error("AuthContext not initialized");
  },
  loginWithApple: async () => {
    throw new Error("AuthContext not initialized");
  },
  logout: async () => {},
  resendVerificationEmail: async () => {},
  checkVerificationStatus: async () => false,
  resendVerificationForUnverifiedUser: async () => {},
  sendPasswordReset: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Start already "not loading" when Firebase isn't configured — there is no
  // onAuthStateChanged callback coming to flip it, and flipping it
  // synchronously inside the effect body would trigger a cascading render.
  const [loading, setLoading] = useState(() => auth !== null);
  const authActionInProgress = useRef(false);

  const currentUidRef = useRef<string | null>(null);

  const getActionCodeSettings = () => {
    return {
      url:
        typeof window !== "undefined"
          ? window.location.origin
          : "https://usdegrees.web.app",
      handleCodeInApp: false,
    };
  };

  // Ask the backend whether an email may register/sign in right now, or is
  // still within the 24h post-deactivation cooldown. `available: null` means
  // the check itself failed (network/backend error) — callers that create an
  // account must treat that as fail-closed, not as "available".
  const checkEmailAvailability = async (
    email: string,
  ): Promise<{ available: boolean | null; eligibleAt?: string }> => {
    try {
      const res = await fetch(
        `/api/proxy/account/availability?email=${encodeURIComponent(email.toLowerCase().trim())}`,
      );
      if (!res.ok) return { available: null };
      return await res.json();
    } catch {
      return { available: null };
    }
  };

  const cooldownError = (eligibleAt?: string): UserFacingError => {
    const when = eligibleAt
      ? new Date(eligibleAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "24 hours after deactivation";
    return new UserFacingError(
      `You recently deactivated an account with this email. You can register again after ${when}.`,
    );
  };

  const broadcastAuthChange = (type: "LOGIN" | "LOGOUT") => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "auth_sync_event",
          JSON.stringify({ type, timestamp: Date.now() }),
        );
      } catch (e) {
        console.error("Storage event broadcast failed:", e);
      }
    }
  };

  // Tear down both sides after a failed /user sync so the UI and Firebase
  // never disagree about who is signed in.
  const teardownFailedSync = async () => {
    clearAppJwt();
    currentUidRef.current = null;
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign-out after failed sync:", e);
    }
  };

  const login = async (
    email: string,
    password: string,
    rememberMe = false,
  ): Promise<AuthUser> => {
    if (!auth) throw new UserFacingError(NOT_CONFIGURED_MESSAGE);
    authActionInProgress.current = true;
    try {
      // Drop any app JWT minted for a previously signed-in user
      clearAppJwt();

      // Persist across restarts when "remember me" is set; otherwise keep
      // the session only for the current browser session.
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence,
      );

      // Wrong password and "account in cooldown" must be indistinguishable
      // here — do not branch into a distinct cooldown message on failure.
      // The backend still enforces cooldown independently; this is UI-only.
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      if (!credential.user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      // Sync/load user from Postgres DB via proxy /user
      const res = await syncUserRecord(credential.user, {
        display_name: credential.user.displayName,
        auth_provider: "credentials",
        email_verified: credential.user.emailVerified,
        provider_user_id: credential.user.uid,
      });

      if (!res.ok) {
        await teardownFailedSync();
        throw await syncError(res, "We couldn't load your account. Please try again.");
      }

      const dbUser = await res.json();
      const mappedUser: AuthUser = {
        id: dbUser.id,
        displayName: dbUser.display_name,
        email: dbUser.email,
        photoURL: dbUser.profile_image,
        role: dbUser.role,
        authProvider: "credentials",
        emailVerified: credential.user.emailVerified,
      };
      currentUidRef.current = credential.user.uid;
      setUser(mappedUser);
      broadcastAuthChange("LOGIN");
      window.dispatchEvent(new Event("auth-state-changed"));
      return mappedUser;
    } finally {
      authActionInProgress.current = false;
    }
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string,
    role?: string,
    ageConsent?: boolean,
  ): Promise<AuthUser> => {
    if (!auth) throw new UserFacingError(NOT_CONFIGURED_MESSAGE);
    authActionInProgress.current = true;
    try {
      clearAppJwt();

      // Fail closed: if we can't confirm this email is actually available
      // (backend down/unreachable), do not create a Firebase user — that
      // would let signup slip through during the 24h deactivation cooldown.
      const avail = await checkEmailAvailability(email);
      if (avail.available === null) {
        throw new UserFacingError(
          "We couldn't verify this email. Please try again.",
        );
      }
      if (!avail.available) throw cooldownError(avail.eligibleAt);

      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      if (credential.user) {
        await updateProfile(credential.user, {
          displayName: displayName.trim(),
        });
        await sendEmailVerification(credential.user, getActionCodeSettings());

        let syncOk = false;
        let syncFailure: ApiError | null = null;
        try {
          const res = await syncUserRecord(credential.user, {
            display_name: displayName.trim(),
            auth_provider: "credentials",
            role: role || "student",
            email_verified: false,
            provider_user_id: credential.user.uid,
            age_consent: !!ageConsent,
          });
          syncOk = res.ok;
          if (!res.ok) {
            syncFailure = await readApiError(res, "Create account");
            console.error(
              "Postgres user creation failed during signup:",
              res.status,
            );
          }
        } catch (err) {
          console.error("Postgres user creation error during signup:", err);
        }

        if (!syncOk) {
          // Don't leave an orphan Firebase user with no backend record —
          // delete it so the same email can retry signup.
          let deleted = true;
          try {
            await deleteUser(credential.user);
          } catch (deleteErr) {
            deleted = false;
            console.error("Could not delete orphan Firebase user:", deleteErr);
          }
          try {
            await signOut(auth);
          } catch {
            // already signed out after deleteUser
          }
          clearAppJwt();
          currentUidRef.current = null;
          if (syncFailure && isDisplayable(syncFailure)) throw syncFailure;
          throw new UserFacingError(
            deleted
              ? "We couldn't finish creating your account. Please try again."
              : "Account setup failed. Wait a minute and try again, or reset password if this email is stuck.",
          );
        }
      }
      throw new Error("EMAIL_NOT_VERIFIED");
    } finally {
      authActionInProgress.current = false;
    }
  };

  const loginWithGoogle = async (
    ageConsent?: boolean,
  ): Promise<FirebaseUser> => {
    if (!auth) throw new UserFacingError(NOT_CONFIGURED_MESSAGE);
    // Hold the flag through the popup AND the backend sync so the
    // onAuthStateChanged listener doesn't race a second /user POST, and so
    // this promise only resolves once the backend accepted the user.
    authActionInProgress.current = true;
    try {
      clearAppJwt();
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      currentUidRef.current = fbUser.uid;

      // Only a Google credential may carry the sign-up age consent.
      const isGoogle = fbUser.providerData.some(
        (p) => p.providerId === "google.com",
      );
      let res: Response;
      try {
        res = await syncUserRecord(fbUser, {
          display_name: fbUser.displayName,
          profile_image: fbUser.photoURL,
          auth_provider: "google",
          email_verified: fbUser.emailVerified,
          provider_user_id: fbUser.uid,
          ...(isGoogle && ageConsent !== undefined
            ? { age_consent: ageConsent }
            : {}),
        });
      } catch (err) {
        await teardownFailedSync();
        throw err;
      }
      if (!res.ok) {
        await teardownFailedSync();
        throw await syncError(res, "We couldn't load your account. Please try again.");
      }

      const dbUser = await res.json();
      setUser({
        id: dbUser.id,
        displayName: dbUser.display_name,
        email: dbUser.email,
        photoURL: dbUser.profile_image,
        role: dbUser.role,
        authProvider: "firebase",
        emailVerified: fbUser.emailVerified,
      });
      broadcastAuthChange("LOGIN");
      window.dispatchEvent(new Event("auth-state-changed"));
      return fbUser;
    } finally {
      authActionInProgress.current = false;
    }
  };

  const loginWithApple = async (ageConsent?: boolean): Promise<AuthUser> => {
    if (!auth) throw new UserFacingError(NOT_CONFIGURED_MESSAGE);
    authActionInProgress.current = true;
    try {
      clearAppJwt();
      const { idToken, fullName } = await signInWithApple();
      const { user: dbUser, firebaseToken } = await exchangeAppleIdToken(
        idToken,
        fullName,
        ageConsent,
      );

      // Exchanging Apple's id_token gets us the backend's app JWT, but that
      // alone leaves no persisted Firebase client session — unlike Google,
      // which gets one from signInWithPopup. Without a real Firebase session,
      // there's nothing for silent-restore-on-refresh (exchangeIdToken) to
      // re-authenticate against once the 30-minute app JWT expires. Signing
      // in with the backend-issued custom token establishes that session.
      try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithCustomToken(auth, firebaseToken);
      } catch (e) {
        // Don't leave a backend JWT with no stable Firebase session behind it.
        clearAppJwt();
        throw e;
      }

      const mappedUser: AuthUser = {
        id: dbUser.id,
        displayName: dbUser.display_name ?? null,
        email: dbUser.email ?? null,
        photoURL: dbUser.profile_image ?? null,
        role: dbUser.role,
        authProvider: "apple",
        emailVerified: dbUser.email_verified ?? true,
      };
      setUser(mappedUser);
      broadcastAuthChange("LOGIN");
      window.dispatchEvent(new Event("auth-state-changed"));
      return mappedUser;
    } finally {
      authActionInProgress.current = false;
    }
  };

  const logout = async (): Promise<void> => {
    clearAppJwt();
    currentUidRef.current = null;
    try {
      if (auth) await signOut(auth);
    } catch (err) {
      console.error("Firebase signOut error:", err);
    }
    setUser(null);
    broadcastAuthChange("LOGOUT");
    window.dispatchEvent(new Event("auth-state-changed"));
  };

  const resendVerificationEmail = async (): Promise<void> => {
    if (auth?.currentUser) {
      await sendEmailVerification(auth.currentUser, getActionCodeSettings());
    }
  };

  const checkVerificationStatus = async (): Promise<boolean> => {
    if (auth?.currentUser) {
      await auth.currentUser.reload();
      const verified = auth.currentUser.emailVerified;

      if (verified) {
        let dbUser = null;
        try {
          const res = await syncUserRecord(auth.currentUser, {
            display_name: auth.currentUser.displayName,
            profile_image: auth.currentUser.photoURL,
            auth_provider: providerFor(auth.currentUser),
            email_verified: true,
            provider_user_id: auth.currentUser.uid,
          });
          if (res.ok) {
            dbUser = await res.json();
          }
        } catch (e) {
          console.error("Sync verified status with database failed:", e);
        }

        const mappedUser: AuthUser = {
          id: dbUser?.id,
          displayName: dbUser?.display_name || auth.currentUser.displayName,
          email: dbUser?.email || auth.currentUser.email,
          photoURL: dbUser?.profile_image || auth.currentUser.photoURL,
          role: dbUser?.role || "student",
          authProvider: auth.currentUser.providerData.some(
            (p) => p.providerId === "password",
          )
            ? "credentials"
            : "firebase",
          emailVerified: true,
        };
        currentUidRef.current = auth.currentUser.uid;
        setUser(mappedUser);
        broadcastAuthChange("LOGIN");
        window.dispatchEvent(new Event("auth-state-changed"));
      }
      return verified;
    }
    return false;
  };

  const resendVerificationForUnverifiedUser = async (
    email: string,
    password: string,
  ): Promise<void> => {
    if (!auth) throw new UserFacingError(NOT_CONFIGURED_MESSAGE);
    authActionInProgress.current = true;
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      await sendEmailVerification(credential.user, getActionCodeSettings());
    } finally {
      authActionInProgress.current = false;
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    if (!auth) throw new UserFacingError(NOT_CONFIGURED_MESSAGE);
    await sendPasswordResetEmail(auth, email.trim());
  };

  // Keep the compare-selection and fit-score (GPA/SAT) localStorage caches
  // scoped to whichever account is actually signed in, so logging out,
  // switching accounts, or re-registering under an old account's email never
  // inherits a previous account's data on this browser.
  useEffect(() => {
    // Wait for Firebase to actually resolve the session before treating this
    // as "logged out" — `user` starts null while `loading` is still true, and
    // syncing on that transient null (then again once the real id arrives)
    // double-wipes the compare bucket, racing with anything that hydrates it
    // (e.g. useCompareColleges) right after a fresh page load.
    if (loading) return;
    syncCompareMatrixOwner(user?.id ?? null);
    syncFitStatsOwner(user?.id ?? null);
  }, [user?.id, loading]);

  // Cross-tab auth synchronization listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_sync_event" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.type === "LOGOUT") {
            clearAppJwt();
            currentUidRef.current = null;
            setUser(null);
            window.dispatchEvent(new Event("auth-state-changed"));
          } else if (data.type === "LOGIN") {
            if (auth?.currentUser && auth.currentUser.emailVerified) {
              // Re-verify auth state if needed
              window.dispatchEvent(new Event("auth-state-changed"));
            }
          }
        } catch (err) {
          console.error("Error parsing auth sync event:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    if (!auth) {
      // Firebase isn't configured — render logged-out rather than crashing
      // the tree; auth actions surface NOT_CONFIGURED_MESSAGE when invoked.
      // `loading` already starts false in this case (see useState above).
      return;
    }
    const firebaseAuth = auth;

    let active = true;
    let unsubscribeFirebase: (() => void) | null = null;

    const checkAuth = async () => {
      if (active) {
        unsubscribeFirebase = onAuthStateChanged(
          firebaseAuth,
          async (firebaseUser) => {
            if (!active) return;

            if (firebaseUser) {
              // Only clear app JWT if switching users
              if (currentUidRef.current !== firebaseUser.uid) {
                clearAppJwt();
                currentUidRef.current = firebaseUser.uid;
              }

              if (authActionInProgress.current) {
                // The in-flight action syncs the user itself; still end the
                // initial loading state so gated pages don't spin forever.
                setLoading(false);
                return;
              }

              if (!firebaseUser.emailVerified) {
                setUser(null);
                setLoading(false);
                return;
              }

              const isPasswordAuth = firebaseUser.providerData.some(
                (p) => p.providerId === "password",
              );

              try {
                const res = await syncUserRecord(firebaseUser, {
                  display_name: firebaseUser.displayName,
                  profile_image: firebaseUser.photoURL,
                  auth_provider: providerFor(firebaseUser),
                  email_verified: firebaseUser.emailVerified,
                  provider_user_id: firebaseUser.uid,
                });
                if (res.ok) {
                  if (!active) return;
                  const dbUser = await res.json();
                  setUser({
                    id: dbUser.id,
                    displayName: dbUser.display_name,
                    email: dbUser.email,
                    photoURL: dbUser.profile_image,
                    role: dbUser.role,
                    authProvider: isPasswordAuth ? "credentials" : "firebase",
                    emailVerified: firebaseUser.emailVerified,
                  });
                } else {
                  // Postgres sync failed — do not leave the UI looking
                  // signed-out while Firebase still has a live session (that
                  // desync let a later exchangeIdToken mint an app JWT for a
                  // "logged out" user). Tear down both sides consistently.
                  console.error(
                    "Failed to sync user with backend:",
                    res.status,
                  );
                  clearAppJwt();
                  currentUidRef.current = null;
                  if (active) setUser(null);
                  try {
                    await signOut(firebaseAuth);
                  } catch (signOutErr) {
                    console.error(
                      "Sign-out after failed sync error:",
                      signOutErr,
                    );
                  }
                  if (active) {
                    notification.error({
                      message: "We couldn't load your account.",
                      description: "Please sign in again.",
                      duration: 6,
                    });
                  }
                }
              } catch (err) {
                console.error("Error syncing user:", err);
                clearAppJwt();
                currentUidRef.current = null;
                if (active) setUser(null);
                try {
                  await signOut(firebaseAuth);
                } catch (signOutErr) {
                  console.error(
                    "Sign-out after failed sync error:",
                    signOutErr,
                  );
                }
                if (active) {
                  notification.error({
                    message: "We couldn't load your account.",
                    description: "Please sign in again.",
                    duration: 6,
                  });
                }
              }
            } else {
              currentUidRef.current = null;
              clearAppJwt();
              setUser(null);
            }
            setLoading(false);
          },
        );
      }
    };

    checkAuth();

    return () => {
      active = false;
      if (unsubscribeFirebase) {
        unsubscribeFirebase();
      }
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        loginWithGoogle,
        loginWithApple,
        logout,
        resendVerificationEmail,
        checkVerificationStatus,
        resendVerificationForUnverifiedUser,
        sendPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
