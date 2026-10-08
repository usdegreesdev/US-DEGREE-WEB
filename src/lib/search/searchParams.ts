/**
 * Per-endpoint query-param allowlists for the list endpoints the browser calls
 * through the proxy. Each spec maps an accepted param to a normaliser that
 * returns the value to forward, or null to drop the param. Shared by the proxy
 * (which enforces it on browser traffic) and the SSR / client request builders,
 * so they can't drift.
 *
 * /search is derived from every caller: the /search page (title,
 * credential_title, state, sort, page, limit, and `type=programs` from the hero
 * search) and the match engine. `type=universities` was only ever sent by the
 * sitemap, which now uses GET /sitemap/universities, so it is not accepted.
 */
export type ParamSpec = Record<string, (value: string) => string | null>;

const POSITIVE_INT = /^[1-9]\d{0,5}$/;
const positiveInt = (v: string) => (POSITIVE_INT.test(v) ? v : null);
const text = (max: number) => (v: string) => {
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

/** The backend accepts at most this many comma-separated state / credential values. */
export const MAX_MULTI_VALUES = 10;

/** Comma-separated multi-select; extra values past the backend's limit are cut. */
export const csv = (v: string): string | null => {
  const parts = v.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts.slice(0, MAX_MULTI_VALUES).join(",") : null;
};

export const SEARCH_SPEC: ParamSpec = {
  title: text(200),
  credential_title: csv,
  state: csv,
  sort: text(50),
  page: positiveInt,
  limit: positiveInt,
  type: (v) => (v === "programs" ? v : null),
};

/** GET /catalog/programs-by-credential: the full distinct list, no paging. */
export const PROGRAMS_BY_CREDENTIAL_SPEC: ParamSpec = {
  credential_title: text(100),
};

/** GET /catalog/schools-for-program: a typeahead page, capped by the backend. */
export const SCHOOLS_FOR_PROGRAM_SPEC: ParamSpec = {
  cip_code: (v) => (/^[0-9.]{1,12}$/.test(v) ? v : null),
  credential_title: text(100),
  q: text(100),
  page: positiveInt,
  limit: positiveInt,
};

/** Copy only allowlisted, well-formed params (first occurrence wins). */
export function pickParams(
  source: URLSearchParams,
  spec: ParamSpec,
): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of source) {
    const normalise = spec[key];
    if (!normalise || out.has(key)) continue;
    const normalised = normalise(value);
    if (normalised !== null) out.set(key, normalised);
  }
  return out;
}

export const pickSearchParams = (source: URLSearchParams) =>
  pickParams(source, SEARCH_SPEC);

/** Per-page caps by tier, and the page-depth cap, which applies to both. */
export const ANON_MAX_PAGE_SIZE = 20;
export const AUTH_MAX_PAGE_SIZE = 50;
export const MAX_PAGES = 25;

/** Tell the UI why a /search call failed, from the status the backend sent. */
export type SearchFailure =
  | "rate_limited" // 429
  | "unauthorized" // 401
  | "depth_limit" // 400 on a page past 1: the page-depth cap (page 26)
  | "bad_request" // 400 on page 1
  | "generic";

export function classifySearchFailure(
  status: number,
  page: number,
): SearchFailure {
  if (status === 429) return "rate_limited";
  if (status === 401) return "unauthorized";
  if (status === 400) return page > 1 ? "depth_limit" : "bad_request";
  return "generic";
}

/** Rows from a /search body, whether it is a bare array or `{ results, ... }`. */
export function extractSearchRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const results = (data as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  return [];
}
