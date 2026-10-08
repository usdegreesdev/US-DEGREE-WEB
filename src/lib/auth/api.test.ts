import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const getIdToken = vi.fn();
const authStateReady = vi.fn();

// firebase.ts calls initializeApp at import time, which needs real config and
// network. Stub the module so the auth layer can be tested in isolation.
vi.mock("@/lib/firebase", () => ({
  auth: {
    get currentUser() {
      return mockCurrentUser;
    },
    authStateReady: () => authStateReady(),
  },
}));

let mockCurrentUser: { getIdToken: typeof getIdToken } | null = null;

import {
  authedFetch,
  exchangeIdToken,
  fetchSavedColleges,
  saveCollege,
  unsaveCollege,
  addCompareMatrixEntry,
  CompareLimitReachedError,
  resolveSalaryValue,
} from "./api";
import { getAppJwt, setAppJwt, clearAppJwt } from "./tokenStore";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("auth/api", () => {
  beforeEach(() => {
    clearAppJwt();
    mockCurrentUser = { getIdToken };
    getIdToken.mockResolvedValue("firebase-id-token");
    authStateReady.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    clearAppJwt();
  });

  describe("exchangeIdToken", () => {
    it("exchanges a Firebase ID token for the backend app JWT and stores it", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse({ token: "app-jwt" }));

      const token = await exchangeIdToken();

      expect(token).toBe("app-jwt");
      expect(getAppJwt()).toBe("app-jwt");
      expect(fetchMock.mock.calls[0][0]).toBe("/api/proxy/auth/login");
    });

    // Auth spec: identity is derived server-side from the verified Firebase
    // token. The client must never send uid/email for the backend to trust.
    it("sends only the ID token, never uid or email", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse({ token: "app-jwt" }));

      await exchangeIdToken();

      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(body).toEqual({ idToken: "firebase-id-token" });
      expect(body).not.toHaveProperty("email");
      expect(body).not.toHaveProperty("uid");
    });

    it("clears any stored JWT and throws when nobody is signed in", async () => {
      mockCurrentUser = null;
      setAppJwt("stale-jwt");

      await expect(exchangeIdToken()).rejects.toThrow(
        /no authenticated Firebase user/,
      );
      expect(getAppJwt()).toBeNull();
    });

    it("clears the stored JWT when the exchange is rejected", async () => {
      setAppJwt("stale-jwt");
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        jsonResponse({ error: "bad" }, 401),
      );

      await expect(exchangeIdToken()).rejects.toThrow(/Token exchange failed/);
      expect(getAppJwt()).toBeNull();
    });

    it("throws when the backend returns no token", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}));

      await expect(exchangeIdToken()).rejects.toThrow(/no app JWT/);
      expect(getAppJwt()).toBeNull();
    });

    it("deduplicates concurrent exchanges into a single network call", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse({ token: "app-jwt" }));

      const [a, b] = await Promise.all([exchangeIdToken(), exchangeIdToken()]);

      expect(a).toBe("app-jwt");
      expect(b).toBe("app-jwt");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("authedFetch", () => {
    it("mints an app JWT when none is held, then attaches it", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse({ token: "app-jwt" }))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      await authedFetch("/profile");

      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe("/api/proxy/profile");
      expect(
        (init?.headers as Record<string, string>).Authorization,
      ).toBe("Bearer app-jwt");
    });

    it("reuses the in-memory JWT without re-exchanging", async () => {
      setAppJwt("cached-jwt");
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse({ ok: true }));

      await authedFetch("/profile");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe("/api/proxy/profile");
    });

    // The core session-continuity guarantee: an expired app JWT must never
    // surface as a re-login prompt.
    it("on 401 forces a fresh Firebase token, re-exchanges, and retries once", async () => {
      setAppJwt("expired-jwt");
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse({ error: "expired" }, 401))
        .mockResolvedValueOnce(jsonResponse({ token: "new-jwt" }))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      const res = await authedFetch("/profile");

      expect(res.status).toBe(200);
      // forceRefresh must be true, or Firebase hands back the same cached
      // (expired) token and the retry fails identically.
      expect(getIdToken).toHaveBeenCalledWith(true);
      expect(
        (fetchMock.mock.calls[2][1]?.headers as Record<string, string>)
          .Authorization,
      ).toBe("Bearer new-jwt");
    });

    it("treats AUTH_TOKEN_EXPIRED as an expired token even on a non-401 status", async () => {
      setAppJwt("expired-jwt");
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          jsonResponse(
            { error: { code: "AUTH_TOKEN_EXPIRED", message: "x" }, requestId: "r1" },
            403,
          ),
        )
        .mockResolvedValueOnce(jsonResponse({ token: "new-jwt" }))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      const res = await authedFetch("/profile");

      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("does not retry other non-401 errors", async () => {
      setAppJwt("jwt");
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          jsonResponse({ error: { code: "FORBIDDEN", message: "x" } }, 403),
        );

      const res = await authedFetch("/profile");

      expect(res.status).toBe(403);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("retries at most once, returning the second 401", async () => {
      setAppJwt("expired-jwt");
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse({}, 401))
        .mockResolvedValueOnce(jsonResponse({ token: "new-jwt" }))
        .mockResolvedValueOnce(jsonResponse({}, 401));

      const res = await authedFetch("/profile");

      expect(res.status).toBe(401);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("preserves caller headers and method alongside the Authorization header", async () => {
      setAppJwt("jwt");
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse({ ok: true }));

      await authedFetch("/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: "Ada" }),
      });

      const init = fetchMock.mock.calls[0][1];
      const headers = init?.headers as Record<string, string>;
      expect(init?.method).toBe("PATCH");
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers.Authorization).toBe("Bearer jwt");
    });
  });

  describe("saved colleges", () => {
    beforeEach(() => setAppJwt("jwt"));

    it("returns the saved list", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        jsonResponse([{ unitid: "1", name: "Test U" }]),
      );

      await expect(fetchSavedColleges()).resolves.toHaveLength(1);
    });

    // The backend has returned an error object here before; Array.isArray
    // guards the UI from mapping over a non-array.
    it("returns an empty array when the backend sends a non-array", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        jsonResponse({ error: "nope" }),
      );

      await expect(fetchSavedColleges()).resolves.toEqual([]);
    });

    it("throws on a failed load", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 500));
      await expect(fetchSavedColleges()).rejects.toThrow(
        /Load saved colleges failed \(500\)/,
      );
    });

    it("posts exactly { unitid } and no other identity", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse({}));

      await saveCollege("9999");

      expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
        unitid: "9999",
      });
    });

    it("url-encodes the unitid when unsaving", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(jsonResponse({}));

      await unsaveCollege("a/b");

      expect(fetchMock.mock.calls[0][0]).toBe("/api/proxy/saved-colleges/a%2Fb");
      expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
    });
  });

  describe("compare matrix", () => {
    beforeEach(() => setAppJwt("jwt"));

    // The compare UI shows a distinct "limit reached" message for 409, so the
    // typed error must survive rather than collapsing into a generic failure.
    it("raises CompareLimitReachedError on 409", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 409));

      await expect(addCompareMatrixEntry({ unitid: "1" })).rejects.toBeInstanceOf(
        CompareLimitReachedError,
      );
    });

    it("raises a generic error on other failures", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 500));

      const err = await addCompareMatrixEntry({ unitid: "1" }).catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err).not.toBeInstanceOf(CompareLimitReachedError);
    });
  });

  describe("resolveSalaryValue", () => {
    it("unwraps a bare number", () => {
      expect(resolveSalaryValue(52000)).toBe(52000);
    });

    it("unwraps the resolved-earnings object", () => {
      expect(
        resolveSalaryValue({
          value: 61000,
          cohort: "year_5",
          basis: "program",
          basis_is_estimated: false,
        }),
      ).toBe(61000);
    });

    it("maps null and undefined to null", () => {
      expect(resolveSalaryValue(null)).toBeNull();
      expect(resolveSalaryValue(undefined)).toBeNull();
    });

    // 0 is a real salary figure and must not be treated as "no data".
    it("preserves a genuine zero", () => {
      expect(resolveSalaryValue(0)).toBe(0);
    });
  });
});
