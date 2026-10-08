import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const fbUser = {
  uid: "u1",
  displayName: "G",
  photoURL: null,
  emailVerified: true,
  providerData: [{ providerId: "google.com" }],
  getIdToken: vi.fn(async () => "idtok"),
};
const signOut = vi.fn(async () => {});

vi.mock("@/lib/firebase", () => ({ auth: {}, googleProvider: {} }));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(async () => ({ user: fbUser })),
  signOut: (...a: unknown[]) => signOut(...(a as [])),
  setPersistence: vi.fn(async () => {}),
  browserLocalPersistence: {},
  browserSessionPersistence: {},
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  updateProfile: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithCustomToken: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock("@/lib/appleAuth", () => ({ signInWithApple: vi.fn() }));
vi.mock("@/components/compare/compareMatrixStore", () => ({
  syncCompareMatrixOwner: vi.fn(),
}));
vi.mock("@/lib/fitScoreSync", () => ({ syncFitStatsOwner: vi.fn() }));

import { AuthProvider, useAuth } from "./AuthContext";
import { getFriendlyErrorMessage } from "@/lib/auth/authErrors";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const consentRejected = () =>
  new Response(
    JSON.stringify({ error: { code: "AGE_CONSENT_REQUIRED" } }),
    { status: 400 },
  );

describe("loginWithGoogle consent", () => {
  beforeEach(() => {
    signOut.mockClear();
  });

  it("sends age_consent and surfaces AGE_CONSENT_REQUIRED, signing out", async () => {
    const fetchMock = vi.fn(async () => consentRejected());
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAuth(), { wrapper });

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.loginWithGoogle(true);
      } catch (e) {
        caught = e;
      }
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).age_consent).toBe(true);
    expect(getFriendlyErrorMessage(caught)).toBe(
      "You must confirm you are 18 or older to continue.",
    );
    expect(signOut).toHaveBeenCalled();
    await waitFor(() => expect(result.current.user).toBeNull());
  });
});
