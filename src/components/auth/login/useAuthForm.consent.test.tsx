import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { ApiError } from "@/lib/auth/apiError";

const loginWithGoogle = vi.fn();
const loginWithApple = vi.fn();
const signup = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    login: vi.fn(),
    signup,
    loginWithGoogle,
    loginWithApple,
    resendVerificationForUnverifiedUser: vi.fn(),
    checkVerificationStatus: vi.fn(),
    sendPasswordReset: vi.fn(),
  }),
}));

import { useAuthForm } from "./useAuthForm";

const COPY = "You must confirm you are 18 or older to continue.";
const rejection = () => new ApiError("Sync account", 400, "AGE_CONSENT_REQUIRED");

function setup() {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  const hook = renderHook(() =>
    useAuthForm({ isOpen: true, initialMode: "login", onClose, onSuccess }),
  );
  act(() => hook.result.current.setAgeConsent(true));
  return { ...hook, onClose, onSuccess };
}

describe("useAuthForm AGE_CONSENT_REQUIRED", () => {
  it("Google: keeps the modal open and shows the copy", async () => {
    loginWithGoogle.mockRejectedValueOnce(rejection());
    const { result, onClose, onSuccess } = setup();
    await act(() => result.current.handleGoogleSignIn());
    expect(loginWithGoogle).toHaveBeenCalledWith(true);
    expect(result.current.error).toContain(COPY);
    expect(onClose).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("Apple: keeps the modal open and shows the copy", async () => {
    loginWithApple.mockRejectedValueOnce(rejection());
    const { result, onClose } = setup();
    await act(() => result.current.handleAppleSignIn());
    expect(loginWithApple).toHaveBeenCalledWith(true);
    expect(result.current.error).toContain(COPY);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Email signup: shows the copy", async () => {
    signup.mockRejectedValueOnce(rejection());
    const { result } = setup();
    act(() => {
      result.current.setMode("signup");
      result.current.setName("A B");
      result.current.setEmail("a@b.co");
      result.current.setPassword("secret1");
      result.current.setConfirmPassword("secret1");
    });
    await act(() =>
      result.current.handleAuthSubmit({
        preventDefault() {},
      } as unknown as React.FormEvent),
    );
    expect(result.current.error).toContain(COPY);
  });

  it("blocks Google/Apple without the checkbox, before calling auth", async () => {
    loginWithGoogle.mockClear();
    const { result } = setup();
    act(() => result.current.setAgeConsent(false));
    await act(() => result.current.handleGoogleSignIn());
    expect(loginWithGoogle).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
});
