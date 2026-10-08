import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// unstable_cache needs Next's incremental cache, which isn't present under
// vitest; run the wrapped function directly (every call is a cache miss).
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import sitemap from "./sitemap";

function backendReturns(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    );
}

const universityEntries = async () =>
  (await sitemap()).filter((e) => e.url.includes("/university/"));

describe("sitemap", () => {
  beforeEach(() => {
    process.env.API_URL = "https://api.example.com";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("builds /university/<unitid> URLs from the sitemap endpoint", async () => {
    const fetchMock = backendReturns([{ unitid: 100654, slug: null, updated_at: null }]);
    const entries = await universityEntries();
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.com/sitemap/universities",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].url.endsWith("/university/100654")).toBe(true);
  });

  it("omits lastmod when updated_at is null or invalid, never emitting 'null'", async () => {
    backendReturns([
      { unitid: 1, slug: null, updated_at: null },
      { unitid: 2, slug: null, updated_at: "garbage" },
      { unitid: 3, slug: null, updated_at: "2026-09-01T00:00:00Z" },
    ]);
    const [a, b, c] = await universityEntries();
    expect(a.lastModified).toBeUndefined();
    expect(b.lastModified).toBeUndefined();
    expect(c.lastModified).toEqual(new Date("2026-09-01T00:00:00Z"));
    for (const e of [a, b, c]) expect(e.url).not.toContain("null");
  });

  it("skips rows without a unitid", async () => {
    backendReturns([{ unitid: null }, { unitid: 7 }]);
    expect(await universityEntries()).toHaveLength(1);
  });

  it("throws when the endpoint is not ok", async () => {
    backendReturns({ detail: "nope" }, 500);
    await expect(sitemap()).rejects.toThrow(/returned 500/);
  });

  it("throws on 0 rows or a non-array body", async () => {
    backendReturns([]);
    await expect(sitemap()).rejects.toThrow(/0 universities/);
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    backendReturns({ not: "an array" });
    await expect(sitemap()).rejects.toThrow(/0 universities/);
  });
});
