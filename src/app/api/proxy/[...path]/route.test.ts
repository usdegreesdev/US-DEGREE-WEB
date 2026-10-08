import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";

const ORIGINAL = { ...process.env };

function req(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

/** Route params arrive as a promise in the App Router. */
function params(path: string[]) {
  return Promise.resolve({ path });
}

describe("/api/proxy", () => {
  beforeEach(() => {
    process.env.API_URL = "https://api.example.com";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
    vi.restoreAllMocks();
  });

  describe("forwarding", () => {
    it("forwards GET to the backend, preserving path and query string", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          new Response('{"ok":true}', {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );

      const res = await GET(
        req("http://localhost/api/proxy/programs?credential_level=3&q=nurse"),
        { params: params(["programs"]) },
      );

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://api.example.com/programs?credential_level=3&q=nurse",
      );
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ ok: true });
    });

    it("joins multi-segment catch-all paths", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("[]", { status: 200 }));

      await GET(req("http://localhost/api/proxy/compare/matrix/details"), {
        params: params(["compare", "matrix", "details"]),
      });

      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://api.example.com/compare/matrix/details",
      );
    });

    // Auth spec §4.9: the proxy is a pass-through for identity. It must never
    // mint, inject, or strip the caller's Authorization header.
    it("forwards the caller's Authorization header untouched", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("{}", { status: 200 }));

      await GET(
        req("http://localhost/api/proxy/profile", {
          headers: { authorization: "Bearer app-jwt-123" },
        }),
        { params: params(["profile"]) },
      );

      const headers = fetchMock.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers.Authorization).toBe("Bearer app-jwt-123");
    });

    it("omits Authorization entirely when the caller sent none", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("{}", { status: 200 }));

      await GET(req("http://localhost/api/proxy/colleges/1234"), {
        params: params(["colleges", "1234"]),
      });

      const headers = fetchMock.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers).not.toHaveProperty("Authorization");
    });

    it("relays the upstream status code rather than normalising it", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response('{"error":"limit"}', { status: 409 }),
      );

      const res = await POST(
        req("http://localhost/api/proxy/compare/matrix/entry", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ unitid: "1" }),
        }),
        { params: params(["compare", "matrix", "entry"]) },
      );

      // The compare UI distinguishes 409 (limit reached) from other failures.
      expect(res.status).toBe(409);
    });

    it("forwards DELETE without a body", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("[]", { status: 200 }));

      await DELETE(req("http://localhost/api/proxy/saved-colleges/1234"), {
        params: params(["saved-colleges", "1234"]),
      });

      expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
      expect(fetchMock.mock.calls[0][1]?.body).toBeUndefined();
    });
  });

  describe("request bodies", () => {
    it("forwards a JSON body verbatim", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("{}", { status: 200 }));

      await POST(
        req("http://localhost/api/proxy/saved-colleges", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ unitid: "9999" }),
        }),
        { params: params(["saved-colleges"]) },
      );

      expect(fetchMock.mock.calls[0][1]?.body).toBe('{"unitid":"9999"}');
    });

    // Guards the re-serialisation bug: JSON.stringify(parsed) behind a
    // truthiness check drops bodies that are legitimately falsy.
    it("does not drop a falsy-but-valid JSON body", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("{}", { status: 200 }));

      await POST(
        req("http://localhost/api/proxy/flag", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "false",
        }),
        { params: params(["flag"]) },
      );

      expect(fetchMock.mock.calls[0][1]?.body).toBe("false");
    });

    it("sends no body for non-JSON content types", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("{}", { status: 200 }));

      await POST(
        req("http://localhost/api/proxy/profile", {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "hello",
        }),
        { params: params(["profile"]) },
      );

      expect(fetchMock.mock.calls[0][1]?.body).toBeUndefined();
    });
  });

  describe("input validation", () => {
    it("rejects an empty path", async () => {
      const res = await GET(req("http://localhost/api/proxy/"), {
        params: params([]),
      });
      expect(res.status).toBe(400);
    });

    it("rejects traversal segments instead of forwarding them", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch");

      const res = await GET(req("http://localhost/api/proxy/a"), {
        params: params(["..", "..", "admin"]),
      });

      expect(res.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("path allowlist", () => {
    it("404s an unlisted path without contacting the backend", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch");

      const res = await GET(
        req("http://localhost/api/proxy/not-a-real-route"),
        { params: params(["not-a-real-route"]) },
      );

      expect(res.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("404s an unlisted path for POST/PATCH/PUT/DELETE too", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch");

      const res = await POST(
        req("http://localhost/api/proxy/totally-unknown", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }),
        { params: params(["totally-unknown"]) },
      );

      expect(res.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("allows a listed prefix's sub-paths", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("{}", { status: 200 }));

      await GET(
        req("http://localhost/api/proxy/compare/matrix/entry/123"),
        { params: params(["compare", "matrix", "entry", "123"]) },
      );

      expect(fetchMock).toHaveBeenCalledOnce();
    });
  });

  describe("error handling", () => {
    // A raw error.message here reads "connect ECONNREFUSED 10.0.3.14:8000",
    // disclosing the internal backend address to any client.
    it("does not leak the upstream error message to the client", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("connect ECONNREFUSED 10.0.3.14:8000"),
      );

      const res = await GET(req("http://localhost/api/proxy/profile"), {
        params: params(["profile"]),
      });

      expect(res.status).toBe(502);
      const body = await res.json();
      expect(body.error).toBe("Upstream request failed");
      expect(JSON.stringify(body)).not.toContain("10.0.3.14");
      expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    });

    it("still logs the real error server-side for debugging", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("connect ECONNREFUSED 10.0.3.14:8000"),
      );

      await GET(req("http://localhost/api/proxy/profile"), {
        params: params(["profile"]),
      });

      expect(errorSpy).toHaveBeenCalled();
    });

    it("returns 502 when API_URL is missing in production", async () => {
      delete process.env.API_URL;
      delete process.env.NEXT_PUBLIC_API_URL;
      (process.env as Record<string, string>).NODE_ENV = "production";

      const res = await GET(req("http://localhost/api/proxy/colleges/1234"), {
        params: params(["colleges", "1234"]),
      });

      expect(res.status).toBe(502);
    });
  });

  describe("search hardening", () => {
    function mockOk() {
      return vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async () => new Response("[]", { status: 200 }));
    }
    const search = (qs: string) =>
      GET(req(`http://localhost/api/proxy/search${qs}`), {
        params: params(["search"]),
      });

    it("forwards only allowlisted /search params", async () => {
      const fetchMock = mockOk();
      await search(
        "?title=nursing&state=CA&credential_title=Bachelor&sort=name&page=2&limit=20&type=programs&fields=ssn&offset=9&q=x",
      );
      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        title: "nursing",
        state: "CA",
        credential_title: "Bachelor",
        sort: "name",
        page: "2",
        limit: "20",
        type: "programs",
      });
    });

    it("forwards comma-separated state / credential_title, capped at 10 values", async () => {
      const fetchMock = mockOk();
      const states = Array.from({ length: 12 }, (_, i) => `S${i}`).join(",");
      await search(`?state=${states}&credential_title=A,B`);
      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.searchParams.get("state")?.split(",")).toHaveLength(10);
      expect(url.searchParams.get("credential_title")).toBe("A,B");
    });

    it("allowlists the catalog endpoints' params exactly", async () => {
      const fetchMock = mockOk();
      await GET(
        req(
          "http://localhost/api/proxy/catalog/programs-by-credential?credential_title=Bachelor&limit=9&fields=x",
        ),
        { params: params(["catalog", "programs-by-credential"]) },
      );
      await GET(
        req(
          "http://localhost/api/proxy/catalog/schools-for-program?cip_code=51.3801&credential_title=Bachelor&q=bos&page=2&limit=20&type=universities&offset=1",
        ),
        { params: params(["catalog", "schools-for-program"]) },
      );
      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://api.example.com/catalog/programs-by-credential?credential_title=Bachelor",
      );
      const url = new URL(fetchMock.mock.calls[1][0] as string);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        cip_code: "51.3801",
        credential_title: "Bachelor",
        q: "bos",
        page: "2",
        limit: "20",
      });
    });

    it("does not relay other catalog paths", async () => {
      const fetchMock = mockOk();
      const res = await GET(req("http://localhost/api/proxy/catalog/universities"), {
        params: params(["catalog", "universities"]),
      });
      expect(res.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("drops type=universities and malformed page/limit", async () => {
      const fetchMock = mockOk();
      await search("?type=universities&limit=10000x&page=-1&title=a");
      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://api.example.com/search?title=a",
      );
    });

    it("sends no query string when nothing is allowlisted", async () => {
      const fetchMock = mockOk();
      await search("?fields=all");
      expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/search");
    });

    it("does not relay sub-paths of search or the bare colleges list", async () => {
      const fetchMock = mockOk();
      const a = await GET(req("http://localhost/api/proxy/search/export"), {
        params: params(["search", "export"]),
      });
      const b = await GET(req("http://localhost/api/proxy/colleges"), {
        params: params(["colleges"]),
      });
      expect(a.status).toBe(404);
      expect(b.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("strips query params from colleges/<id> calls", async () => {
      const fetchMock = mockOk();
      await GET(req("http://localhost/api/proxy/colleges/1?limit=99999"), {
        params: params(["colleges", "1"]),
      });
      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://api.example.com/colleges/1",
      );
    });

    it("passes the backend status through and forbids caching", async () => {
      for (const status of [400, 401, 429]) {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
          new Response('{"detail":"x"}', {
            status,
            headers: { "retry-after": "30" },
          }),
        );
        const res = await search("?title=a");
        expect(res.status).toBe(status);
        expect(res.headers.get("cache-control")).toBe("private, no-store");
        expect(res.headers.get("vary")).toBe("Authorization");
        expect(res.headers.get("retry-after")).toBe("30");
      }
    });

    it("fetches the backend with cache: no-store and no server credential", async () => {
      const fetchMock = mockOk();
      await search("?title=a");
      expect(fetchMock.mock.calls[0][1]?.cache).toBe("no-store");
      const headers = fetchMock.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe("client IP forwarding", () => {
    const sign = (ip: string, secret: string) =>
      createHmac("sha256", secret).update(ip).digest("hex");

    async function callWith(headers: Record<string, string>) {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("[]", { status: 200 }));
      await GET(req("http://localhost/api/proxy/search?title=a", { headers }), {
        params: params(["search"]),
      });
      return fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    }

    it("signs the first x-forwarded-for hop", async () => {
      process.env.PROXY_IP_SECRET = "s3cret";
      const h = await callWith({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
      expect(h["X-Client-IP"]).toBe("203.0.113.7");
      expect(h["X-Proxy-Signature"]).toBe(sign("203.0.113.7", "s3cret"));
    });

    it("ignores browser-supplied X-Client-IP / X-Proxy-Signature", async () => {
      process.env.PROXY_IP_SECRET = "s3cret";
      const h = await callWith({
        "x-forwarded-for": "203.0.113.7",
        "x-client-ip": "1.2.3.4",
        "x-proxy-signature": "forged",
      });
      expect(h["X-Client-IP"]).toBe("203.0.113.7");
      expect(h["X-Proxy-Signature"]).toBe(sign("203.0.113.7", "s3cret"));
    });

    it("sends neither header when the IP is unknown, even if forged", async () => {
      process.env.PROXY_IP_SECRET = "s3cret";
      const h = await callWith({
        "x-client-ip": "1.2.3.4",
        "x-proxy-signature": "forged",
      });
      expect(h["X-Client-IP"]).toBeUndefined();
      expect(h["X-Proxy-Signature"]).toBeUndefined();
    });

    it("omits both headers when PROXY_IP_SECRET is unset", async () => {
      delete process.env.PROXY_IP_SECRET;
      const h = await callWith({ "x-forwarded-for": "203.0.113.7" });
      expect(h["X-Client-IP"]).toBeUndefined();
      expect(h["X-Proxy-Signature"]).toBeUndefined();
    });
  });
});
