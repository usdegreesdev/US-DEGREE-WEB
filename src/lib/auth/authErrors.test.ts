import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  GENERIC_AUTH_ERROR,
  UserFacingError,
  backendMessageFor,
  unavailableEmailMessage,
  getFriendlyError,
  getFriendlyErrorMessage,
  isCancelledPopupError,
} from "./authErrors";
import { ApiError, readApiError } from "./apiError";

const firebase = (code: string, message = `Firebase: Error (${code}).`) =>
  Object.assign(new Error(message), { code });

describe("getFriendlyErrorMessage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("Firebase codes", () => {
    const expected: Record<string, string> = {
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

    for (const [code, message] of Object.entries(expected)) {
      it(`maps ${code}`, () => {
        expect(getFriendlyErrorMessage(firebase(code))).toBe(message);
      });
    }

    it("gives invalid-credential, wrong-password and user-not-found the SAME message", () => {
      const messages = [
        "auth/invalid-credential",
        "auth/wrong-password",
        "auth/user-not-found",
      ].map((c) => getFriendlyErrorMessage(firebase(c)));
      expect(new Set(messages).size).toBe(1);
      expect(messages[0]).toBe("Invalid email address or password.");
    });
  });

  describe("backend codes", () => {
    it("maps known codes and shows the requestId as a Ref", () => {
      const err = new ApiError("Check email", 409, "EMAIL_ALREADY_IN_USE", "req_abc123");
      expect(getFriendlyError(err)).toEqual({
        message: "This email address is already in use by another account.",
        requestId: "req_abc123",
      });
      expect(getFriendlyErrorMessage(err)).toBe(
        "This email address is already in use by another account. (Ref: req_abc123)",
      );
    });

    it("uses the generic message (plus Ref) for an unmapped code", () => {
      const err = new ApiError("Login", 500, "SOMETHING_NEW", "req_9");
      expect(getFriendlyError(err)).toEqual({
        message: GENERIC_AUTH_ERROR,
        requestId: "req_9",
      });
    });

    it("maps 429 by status when the code is unknown or absent", () => {
      expect(getFriendlyError(new ApiError("Login", 429)).message).toMatch(
        /Too many requests/,
      );
    });

    it("omits the Ref when the backend sent no requestId", () => {
      expect(getFriendlyError(new ApiError("Login", 500)).requestId).toBeUndefined();
      expect(getFriendlyErrorMessage(new ApiError("Login", 500))).toBe(
        GENERIC_AUTH_ERROR,
      );
    });
  });

  describe("never leaks raw text", () => {
    const LEAK = "SELECT * FROM users; at /srv/app/db.js:42 secret-host:5432";

    it("returns the generic message for an unknown code", () => {
      expect(getFriendlyErrorMessage(firebase("auth/brand-new", LEAK))).toBe(
        GENERIC_AUTH_ERROR,
      );
    });

    it("ignores the message of a plain Error", () => {
      expect(getFriendlyErrorMessage(new Error(LEAK))).toBe(GENERIC_AUTH_ERROR);
    });

    it("does not read a code out of message text", () => {
      expect(
        getFriendlyErrorMessage(new Error("Firebase: Error (auth/invalid-email).")),
      ).toBe(GENERIC_AUTH_ERROR);
    });

    it("handles a thrown string, null, undefined, a number and a plain object", () => {
      for (const value of [LEAK, null, undefined, 42, { message: LEAK }]) {
        expect(getFriendlyErrorMessage(value)).toBe(GENERIC_AUTH_ERROR);
      }
    });

    it("ignores a backend body message (ApiError never carries it)", () => {
      const err = new ApiError("Login", 500, undefined, undefined);
      expect(err.message).toBe("Login failed (500)");
      expect(getFriendlyErrorMessage(err)).toBe(GENERIC_AUTH_ERROR);
    });

    it("shows a UserFacingError's own app-authored message", () => {
      expect(getFriendlyErrorMessage(new UserFacingError("Sign-in is not configured."))).toBe(
        "Sign-in is not configured.",
      );
    });
  });

  describe("logging", () => {
    it("logs the raw error outside production", () => {
      vi.stubEnv("NODE_ENV", "development");
      getFriendlyErrorMessage(new Error("raw"));
      expect(console.error).toHaveBeenCalled();
    });

    it("does not log in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      getFriendlyErrorMessage(new Error("raw"));
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});

describe("isCancelledPopupError", () => {
  it("recognises Firebase and Apple cancellations by code", () => {
    expect(isCancelledPopupError(firebase("auth/popup-closed-by-user"))).toBe(true);
    expect(isCancelledPopupError(firebase("auth/cancelled-popup-request"))).toBe(true);
    expect(isCancelledPopupError({ error: "popup_closed_by_user" })).toBe(true);
  });

  it("is false for other errors and non-objects", () => {
    expect(isCancelledPopupError(firebase("auth/popup-blocked"))).toBe(false);
    expect(isCancelledPopupError(new Error("auth/popup-closed-by-user"))).toBe(false);
    expect(isCancelledPopupError("auth/popup-closed-by-user")).toBe(false);
    expect(isCancelledPopupError(null)).toBe(false);
  });
});

describe("readApiError", () => {
  const res = (body: BodyInit | null, status = 400) =>
    new Response(body, { status });

  it("extracts code and requestId from the envelope, dropping error.message", async () => {
    const err = await readApiError(
      res(
        JSON.stringify({
          error: { code: "EMAIL_IN_COOLDOWN", message: "db row 12 locked" },
          requestId: "req_42",
        }),
      ),
      "Check email",
    );
    expect(err.code).toBe("EMAIL_IN_COOLDOWN");
    expect(err.requestId).toBe("req_42");
    expect(err.status).toBe(400);
    expect(err.message).toBe("Check email failed (400)");
  });

  it("tolerates non-JSON bodies", async () => {
    const err = await readApiError(res("<html>502</html>", 502), "Login");
    expect(err.status).toBe(502);
    expect(err.code).toBeUndefined();
  });

  it("drops a code or requestId that isn't a well-formed token", async () => {
    const err = await readApiError(
      res(JSON.stringify({ error: { code: "has spaces & <b>" }, requestId: "x y" })),
      "Login",
    );
    expect(err.code).toBeUndefined();
    expect(err.requestId).toBeUndefined();
  });
});

describe("every backend code is mapped", () => {
  const CODES = [
    "AUTH_TOKEN_MISSING",
    "AUTH_TOKEN_INVALID",
    "AUTH_TOKEN_EXPIRED",
    "AUTH_USER_DISABLED",
    "AUTH_EXCHANGE_FAILED",
    "PROFILE_INVALID",
    "EMAIL_ALREADY_IN_USE",
    "EMAIL_IN_COOLDOWN",
    "CURRENT_EMAIL_NOT_VERIFIED",
    "AGE_CONSENT_REQUIRED",
    "RATE_LIMITED",
    "NOT_FOUND",
    "FORBIDDEN",
    "INVALID_REQUEST",
    "INTERNAL_ERROR",
  ];

  for (const code of CODES) {
    it(`${code} has its own copy, not the generic fallback`, () => {
      const message = backendMessageFor(code);
      expect(message).toBeTruthy();
      expect(message).not.toBe(GENERIC_AUTH_ERROR);
      expect(getFriendlyError(new ApiError("X", 400, code)).message).toBe(message);
    });
  }

  it("shows the three expired/invalid/missing token codes the same way", () => {
    expect(
      new Set(
        ["AUTH_TOKEN_MISSING", "AUTH_TOKEN_INVALID", "AUTH_TOKEN_EXPIRED"].map(
          backendMessageFor,
        ),
      ).size,
    ).toBe(1);
  });
});

describe("AGE_CONSENT_REQUIRED", () => {
  it("shows the exact 18+ copy from an ApiError, with the request id", () => {
    expect(
      getFriendlyError(new ApiError("Sync account", 400, "AGE_CONSENT_REQUIRED", "req-1")),
    ).toEqual({
      message: "You must confirm you are 18 or older to continue.",
      requestId: "req-1",
    });
  });
});

describe("mixed error shapes", () => {
  const json = (body: unknown, status: number, headers: HeadersInit = {}) =>
    new Response(JSON.stringify(body), { status, headers });

  it("new envelope: code and body requestId", async () => {
    const err = await readApiError(
      json({ error: { code: "FORBIDDEN", message: "raw" }, requestId: "req_1" }, 403),
      "X",
    );
    expect(getFriendlyError(err)).toEqual({
      message: "You don't have permission to do that.",
      requestId: "req_1",
    });
  });

  it("falls back to the X-Request-Id header when the body has no requestId", async () => {
    const err = await readApiError(
      json({ error: { code: "NOT_FOUND", message: "raw" } }, 404, {
        "x-request-id": "hdr_7",
      }),
      "X",
    );
    expect(err.requestId).toBe("hdr_7");
    expect(getFriendlyErrorMessage(err)).toMatch(/\(Ref: hdr_7\)$/);
  });

  it("prefers the body requestId over the header", async () => {
    const err = await readApiError(
      json({ error: { code: "NOT_FOUND" }, requestId: "body_1" }, 404, {
        "x-request-id": "hdr_7",
      }),
      "X",
    );
    expect(err.requestId).toBe("body_1");
  });

  it("legacy { error: 'string' }: status only, string never shown", async () => {
    const err = await readApiError(
      json({ error: "Too many search requests, db host 10.0.0.5" }, 429),
      "Search",
    );
    expect(err.code).toBeUndefined();
    const { message } = getFriendlyError(err);
    expect(message).toMatch(/Too many requests/);
    expect(message).not.toContain("10.0.0.5");
    // A legacy string that happens to look like a code is still not trusted.
    const sneaky = await readApiError(json({ error: "FORBIDDEN" }, 500), "X");
    expect(sneaky.code).toBeUndefined();
    expect(getFriendlyError(sneaky).message).toBe(GENERIC_AUTH_ERROR);
  });

  it("legacy shape picks up the X-Request-Id header", async () => {
    const err = await readApiError(
      json({ error: "nope" }, 500, { "x-request-id": "hdr_9" }),
      "X",
    );
    expect(err.requestId).toBe("hdr_9");
  });

  it("/account/email-available 200 { available:false, code, details }: code only", () => {
    const body = {
      available: false,
      code: "EMAIL_IN_COOLDOWN",
      details: "Retry after 2026-10-09T10:00:00Z; row 8812",
    };
    const message = unavailableEmailMessage(body.code);
    expect(message).toBe(backendMessageFor("EMAIL_IN_COOLDOWN"));
    expect(message).not.toContain("8812");
    expect(unavailableEmailMessage(undefined)).toBe(
      "This email address can't be used right now.",
    );
    expect(unavailableEmailMessage("SOMETHING_NEW")).toBe(
      "This email address can't be used right now.",
    );
  });

  it("non-JSON bodies (HTML error page) give status-only errors without crashing", async () => {
    const err = await readApiError(
      new Response("<html><body>502 Bad Gateway nginx/1.2</body></html>", {
        status: 502,
        headers: { "content-type": "text/html", "x-request-id": "edge_3" },
      }),
      "Login",
    );
    expect(err.code).toBeUndefined();
    expect(err.requestId).toBe("edge_3");
    expect(getFriendlyError(err).message).toBe(GENERIC_AUTH_ERROR);
  });

  it("empty bodies and JSON that is not an object don't crash", async () => {
    for (const body of ["", "null", "[]", '"text"', "42"]) {
      const err = await readApiError(new Response(body, { status: 500 }), "X");
      expect(getFriendlyError(err).message).toBe(GENERIC_AUTH_ERROR);
    }
  });

  it("error: null and error: array don't crash", async () => {
    for (const body of [{ error: null }, { error: [] }, { error: { code: 5 } }]) {
      const err = await readApiError(json(body, 500), "X");
      expect(err.code).toBeUndefined();
    }
  });
});
