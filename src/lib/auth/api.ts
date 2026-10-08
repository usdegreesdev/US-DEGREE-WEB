/**
 * Authenticated API layer for the Firebase + backend-JWT model (auth spec §4.1,
 * §4.3, §4.8).
 *
 * Flow: Firebase owns credentials. We exchange a Firebase ID token **once** at
 * POST /auth/login for the backend's app JWT, then send that app JWT as
 * `Authorization: Bearer <appJWT>` on every protected call. On a 401 we fetch a
 * fresh Firebase ID token, re-exchange, and retry once — never a re-login screen.
 *
 * Non-negotiable: identity (uid/email) is NEVER sent in a request body for the
 * backend to trust. The backend derives identity only from the verified Firebase
 * token at /auth/login.
 */

import { auth } from "@/lib/firebase";
import { getAppJwt, setAppJwt, clearAppJwt } from "./tokenStore";
import { getCredentialLevelInfo } from "@/constants/credentialLevel";

// All backend traffic goes through the Next.js proxy route, which forwards the
const PROXY_BASE = "/api/proxy";
let pendingExchangePromise: Promise<string> | null = null;

/**
 * Exchange the current Firebase user's ID token for a backend app JWT.
 * Deduplicates simultaneous calls to prevent race conditions during token exchange.
 *
 * @param forceRefresh force a fresh Firebase ID token (used on 401 so the
 *   re-exchange genuinely gets a new token rather than a cached, expired one).
 */
export async function exchangeIdToken(forceRefresh = false): Promise<string> {
  if (pendingExchangePromise && !forceRefresh) {
    return pendingExchangePromise;
  }

  const doExchange = async (): Promise<string> => {
    try {
      if (!auth) {
        throw new Error("Cannot exchange token: Firebase is not configured");
      }

      // Wait for Firebase to finish restoring any persisted session before
      // deciding there's no user. On a hard page refresh `auth.currentUser` is
      // momentarily null until persistence rehydrates, which otherwise made
      // early authed calls throw "no authenticated Firebase user".
      await auth.authStateReady().catch(() => {});
      const current = auth.currentUser;
      if (!current) {
        clearAppJwt();
        throw new Error(
          "Cannot exchange token: no authenticated Firebase user",
        );
      }

      const idToken = await current.getIdToken(forceRefresh);

      const res = await fetch(`${PROXY_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        clearAppJwt();
        throw new Error(`Token exchange failed (${res.status})`);
      }

      const data = (await res.json()) as { token?: string };
      if (!data.token) {
        clearAppJwt();
        throw new Error("Token exchange returned no app JWT");
      }

      setAppJwt(data.token);
      return data.token;
    } finally {
      pendingExchangePromise = null;
    }
  };

  pendingExchangePromise = doExchange();
  return pendingExchangePromise;
}

/** Shape returned by POST /auth/apple — app JWT plus the found/created user. */
export interface AppleAuthResult {
  token: string;
  /** Firebase custom token — sign in with it via signInWithCustomToken to
   * establish a persisted Firebase client session for the Apple user (the
   * same kind Google/email logins already get from the popup/credential
   * flows), so silent app-JWT restore-on-refresh has a session to key off. */
  firebaseToken: string;
  user: {
    id?: number;
    display_name?: string | null;
    email?: string | null;
    profile_image?: string | null;
    role?: string;
    email_verified?: boolean;
  };
}

/**
 * Send Apple's id_token straight to the backend, which verifies it against
 * Apple's public keys, finds/creates the user, and returns the app JWT, the
 * user record, and a Firebase custom token. Apple's own id_token is verified
 * entirely server-side (no Firebase involved there) — the custom token is
 * what the caller then uses with signInWithCustomToken to establish a real
 * Firebase client session, matching Google/email logins.
 *
 * `fullName` is only ever present on the user's first-ever authorization
 * (Apple never sends it again) — the backend should use it solely when
 * creating a new user, not to overwrite an existing one.
 */
export async function exchangeAppleIdToken(
  idToken: string,
  fullName?: string,
  ageConsent?: boolean,
): Promise<AppleAuthResult> {
  const res = await fetch(`${PROXY_BASE}/auth/apple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_token: idToken,
      full_name: fullName,
      age_consent: !!ageConsent,
    }),
  });

  if (!res.ok) {
    clearAppJwt();
    throw new Error(`Apple sign-in failed (${res.status})`);
  }

  const data = (await res.json()) as AppleAuthResult;
  if (!data.token) {
    clearAppJwt();
    throw new Error("Apple sign-in returned no app JWT");
  }

  setAppJwt(data.token);
  return data;
}

/**
 * Resolve once Firebase has restored any persisted session, returning whether a
 * user is signed in. Client stores use this to avoid firing protected calls
 * (and logging spurious token-exchange errors) when nobody is logged in.
 */
export async function hasAuthenticatedUser(): Promise<boolean> {
  if (!auth) return false;
  try {
    await auth.authStateReady();
  } catch {
    // Older SDKs without authStateReady — fall through to a direct read.
  }
  return !!auth.currentUser;
}

/**
 * Shared authed-fetch wrapper. Every protected API call goes through this:
 * attaches the app JWT and, on a 401, re-exchanges a fresh Firebase ID token
 * once and retries the request.
 *
 * @param path backend path beginning with "/" (e.g. "/profile"). Proxied.
 */
export async function authedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  // No signed-in Firebase user (e.g. an anonymous visitor on a now-public
  // page like /compare) — fall back to a plain, unauthenticated request
  // instead of throwing, so public/browsable endpoints still work. Callers
  // hitting a genuinely user-scoped endpoint just see a non-ok response and
  // handle it themselves (see hasAuthenticatedUser() gates elsewhere).
  if (!(await hasAuthenticatedUser())) {
    return fetch(`${PROXY_BASE}${path}`, options);
  }

  let token = getAppJwt();
  if (!token) {
    // No app JWT in memory (e.g. first call after a page reload) — mint one.
    token = await exchangeIdToken();
  }

  const run = (jwt: string) =>
    fetch(`${PROXY_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${jwt}`,
      },
    });

  let res = await run(token);

  if (res.status === 401) {
    // App JWT expired — refresh the Firebase token, re-exchange, retry once.
    const fresh = await exchangeIdToken(true);
    res = await run(fresh);
  }

  return res;
}

async function parseJson<T>(res: Response, action: string): Promise<T> {
  if (!res.ok) {
    // Log the backend's error body (forwarded verbatim by the proxy)
    // server/browser-console side only, so a 500 isn't opaque to whoever's
    // debugging it — it usually carries the real cause (e.g. a DB error).
    // Never put it in the thrown message: callers render Error.message
    // straight into toasts/forms, and that body can contain stack traces,
    // SQL, or file paths.
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 500);
    } catch {
      // ignore — body may be unreadable
    }
    console.error(`${action} failed (${res.status})`, detail);
    throw new Error(`${action} failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** GET the current user's identity/profile. /auth/me is the alias of GET /profile. */
export async function fetchMe<T = unknown>(): Promise<T> {
  const res = await authedFetch("/auth/me");
  return parseJson<T>(res, "Load account");
}

/** GET /profile — full profile JSON. */
export async function fetchProfile<T = unknown>(): Promise<T> {
  const res = await authedFetch("/profile");
  return parseJson<T>(res, "Load profile");
}

/** PATCH /profile — profile fields only. Email must NOT be included (spec §4.5). */
export async function patchProfile<T = unknown>(
  fields: Record<string, unknown>,
): Promise<T> {
  const res = await authedFetch("/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  return parseJson<T>(res, "Save profile");
}

/** Reason/feedback captured by the deactivation modal. */
export interface DeactivationPayload {
  reason_code: string;
  reason_label: string;
  other_reason?: string;
  improvement_feedback?: string;
  acknowledged: boolean;
}

/**
 * POST /account/delete — soft-deletes the account on the backend and records the
 * deactivation reason/feedback in usduser_deactivations.
 */
export async function deleteAccount(
  payload: DeactivationPayload,
): Promise<void> {
  const res = await authedFetch("/account/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await parseJson<{ ok: boolean }>(res, "Delete account");
}

/** Result of GET /account/email-available. */
export interface EmailAvailability {
  available: boolean;
  code?: "EMAIL_ALREADY_IN_USE" | "EMAIL_IN_COOLDOWN" | "CURRENT_EMAIL_NOT_VERIFIED";
  details?: string;
}

/**
 * GET /account/email-available?email=... — pre-checks a prospective new email
 * against the backend's ownership/cooldown/verification rules *before* a
 * Firebase verification link is sent, so a doomed-to-conflict change is
 * rejected immediately instead of after the user clicks a dead-end link.
 * This is a UX pre-check only: the backend independently re-validates the
 * same conditions when the change is finalized, so a skipped/raced call here
 * cannot put an account in a bad state.
 */
export async function checkEmailAvailable(
  email: string,
): Promise<EmailAvailability> {
  const res = await authedFetch(
    `/account/email-available?email=${encodeURIComponent(email)}`,
  );
  return parseJson<EmailAvailability>(res, "Check email availability");
}

// ---- Saved colleges -------------------------------------------------------

/** A saved college as enriched and returned by GET /saved-colleges. */
export interface SavedCollege {
  unitid: string;
  name: string;
  location: string;
  tuitionFee: number | string | null;
  acceptanceRate: number | string | null;
  createdAt: string;
  schoolUrl?: string | null;
  /** CIP code of the program the college was saved under, if any (disambiguates
   * which program/credential this save refers to when linking to its details
   * page). Absent for a plain college-level save. */
  cipCode?: string | null;
  programName?: string | null;
  credentialLevel?: string | number | null;
  credentialTitle?: string | null;
}

/** GET /saved-colleges — the user's saved colleges, enriched by the backend. */
export async function fetchSavedColleges(): Promise<SavedCollege[]> {
  const res = await authedFetch("/saved-colleges");
  if (!res.ok) throw new Error(`Load saved colleges failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? (data as SavedCollege[]) : [];
}

/** POST /saved-colleges — body is exactly { unitid } (no other identity sent). */
export async function saveCollege(unitid: string): Promise<void> {
  const res = await authedFetch("/saved-colleges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unitid }),
  });
  if (!res.ok) throw new Error(`Save college failed (${res.status})`);
}

/** DELETE /saved-colleges/:unitid — removes a saved college. */
export async function unsaveCollege(unitid: string): Promise<void> {
  const res = await authedFetch(
    `/saved-colleges/${encodeURIComponent(unitid)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`Unsave college failed (${res.status})`);
}

// ---- Reversed compare-bar lookups: Credential -> Program -> College -------
//
// Backed by the dedicated /catalog endpoints. Both are public (optional auth:
// a signed-in token raises the page-size cap), so the compare page works for
// anonymous visitors too. authedFetch attaches the token when there is one and
// falls back to a plain request otherwise.

/** One distinct program offered at a credential level. */
export interface ProgramByCredential {
  title: string;
  cip_code: string;
  credential_level: number;
  credential_title: string;
}

// The list for a level is full and un-paged, so it is fetched once per level
// and filtered locally as the user types.
const programsByCredentialCache = new Map<number, ProgramByCredential[]>();

/**
 * Every distinct program offered at `credentialLevel`, from
 * GET /catalog/programs-by-credential. Powers the compare page's "Program"
 * step; the caller filters the returned list locally.
 */
export async function fetchProgramsByCredential(
  credentialLevel: number,
): Promise<ProgramByCredential[]> {
  const cached = programsByCredentialCache.get(credentialLevel);
  if (cached) return cached;

  const credentialTitle = getCredentialLevelInfo(credentialLevel)?.title;
  if (!credentialTitle) return [];

  const params = new URLSearchParams({ credential_title: credentialTitle });
  const res = await authedFetch(
    `/catalog/programs-by-credential?${params.toString()}`,
  );
  if (!res.ok) throw new Error(`Load programs failed (${res.status})`);

  const data: unknown = await res.json();
  const rows = Array.isArray(data)
    ? (data as { program_title: string; cip_code: string }[])
    : [];
  const programs = rows
    .filter((row) => row.program_title && row.cip_code)
    .map((row) => ({
      title: row.program_title,
      cip_code: String(row.cip_code),
      credential_level: credentialLevel,
      credential_title: credentialTitle,
    }));
  programsByCredentialCache.set(credentialLevel, programs);
  return programs;
}

/** One row from GET /catalog/schools-for-program. */
export interface SchoolForProgram {
  unitid: number;
  school_name: string;
  city: string | null;
  state: string | null;
}

export interface SchoolsForProgramPage {
  schools: SchoolForProgram[];
  /** Total matches, which can exceed `schools.length` (the backend caps a page). */
  total: number | null;
}

/**
 * One page of schools offering `cipCode` at `credentialLevel`, optionally
 * narrowed by school name `q`, from GET /catalog/schools-for-program. Powers
 * the compare page's "College" step as a typeahead: the backend caps a page
 * (20 anonymous, 50 signed in), so the UI narrows with `q` rather than paging.
 */
export async function fetchSchoolsForProgram(
  cipCode: string,
  credentialLevel: number,
  q?: string,
  signal?: AbortSignal,
): Promise<SchoolsForProgramPage> {
  const credentialTitle = getCredentialLevelInfo(credentialLevel)?.title;
  if (!credentialTitle) return { schools: [], total: 0 };

  const params = new URLSearchParams({
    cip_code: cipCode,
    credential_title: credentialTitle,
  });
  const trimmed = q?.trim();
  if (trimmed) params.set("q", trimmed);

  const res = await authedFetch(
    `/catalog/schools-for-program?${params.toString()}`,
    { signal },
  );
  if (!res.ok) throw new Error(`Load schools for program failed (${res.status})`);

  const data = (await res.json()) as {
    results?: SchoolForProgram[];
    total?: number;
  };
  return {
    schools: Array.isArray(data.results) ? data.results : [],
    total: typeof data.total === "number" ? data.total : null,
  };
}

// ---- Colleges selected for comparison -------------------------------------

/**
 * A salary figure resolved via the backend's getEarningsForProgram() — one
 * horizon (e.g. "year_5"), whichever grad_cohort has the best available data
 * for it. Sent instead of a bare number whenever a specific program was
 * matched (see programs.selectedProgram below); use resolveSalaryValue() to
 * get a plain number out of either shape.
 */
export interface EarningsAvgSalaryResolved {
  value: number | null;
  cohort: string | null;
  basis: string | null;
  basis_is_estimated: boolean;
}

/**
 * One row from GET /compare/matrix/details, exactly as the backend sends it.
 *
 * Inconsistent percentage encoding is inherited from the underlying tables,
 * not a bug: `acceptanceRate` and `cost.debtIncomeRatio` are raw fractions
 * (e.g. 0.62), while `academics.graduationRate` and
 * `programs.repaymentSuccess` are already scaled (e.g. 31.69, meaning
 * 31.69%). Every field can be null — null means "no data", never render it
 * as 0 or "N/A" unless the value is actually 0.
 */
export interface SelectedCompareCollege {
  unitid: number | null;
  name: string | null;
  location: string | null;
  tuitionInState: number | null;
  acceptanceRate: number | null; // fraction, e.g. 0.62 — multiply by 100 for %
  addedAt: string | null;
  schoolUrl: string | null;
  schoolType: string | null;
  accreditor: string | null;
  academics: {
    satRangeLow: number | null;
    satRangeHigh: number | null;
    graduationRate: number | null; // already a percentage, e.g. 31.69
  };
  cost: {
    tuitionOutState: number | null;
    stickerPrice: number | null;
    avgDebt: number | null;
    debtIncomeRatio: number | null; // fraction
  };
  outcomes: {
    programEarnings: number | null;
    // A bare school-wide average, OR the getEarningsForProgram() resolution
    // when a specific program was matched — see EarningsAvgSalaryResolved.
    avgSalary: number | EarningsAvgSalaryResolved | null;
    roi20Yr: number | null;
  };
  students: {
    size: number | null; // total enrollment
  };
  programs: {
    studentFacultyRatio: string | null; // e.g. "15:1"
    repaymentSuccess: number | null; // already a percentage, e.g. 36
    popularFields: {
      fieldName: string;
      percentage: number;
      programCount: number;
    }[];
    degreeLevels: {
      level: string;
      totalPrograms: number;
      topTitles: string[];
    }[];
    // Set whenever this entry's own cipCode/credentialLevel matched a
    // program at this college (see GET /compare/matrix/details).
    selectedProgram: {
      title: string;
      cipCode: string | null;
      degreeLevelCategory: string | null;
      credentialLevel: number | null;
      earnings: number | EarningsAvgSalaryResolved | null;
    } | null;
  };
}

/** Unwraps either shape outcomes.avgSalary / selectedProgram.earnings can take. */
export function resolveSalaryValue(
  v: number | EarningsAvgSalaryResolved | null | undefined,
): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === "number" ? v : v.value;
}

// ---- Compare page's per-program matrix -------------------------------------
//
// The single source of truth for "colleges queued for comparison" across the
// whole app (search cards, Intelligent Matches, the university page, and the
// /compare page's own filter) — see compareMatrixStore.ts. The same unitid
// can appear more than once, one entry per program picked for that college.

/** One program-specific row in the compare matrix. */
export interface CompareMatrixEntry {
  unitid: string;
  cipCode: string | null;
  credentialLevel: string | null;
  programName: string | null;
  credentialTitle: string | null;
}

/** GET /compare/matrix — the signed-in user's persisted compare-page matrix. */
export async function fetchCompareMatrix(): Promise<CompareMatrixEntry[]> {
  const res = await authedFetch("/compare/matrix");
  if (!res.ok) throw new Error(`Load comparison matrix failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? (data as CompareMatrixEntry[]) : [];
}

/**
 * PUT /compare/matrix — replaces the user's entire compare-page matrix with
 * `entries`. Whole-list replace; only safe for single-writer operations like
 * clearing the matrix entirely. Anything that adds/removes one entry at a
 * time should use addCompareMatrixEntry/removeCompareMatrixEntry instead,
 * which are atomic against concurrent callers.
 */
export async function saveCompareMatrix(
  entries: CompareMatrixEntry[],
): Promise<void> {
  const res = await authedFetch("/compare/matrix", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) throw new Error(`Save comparison matrix failed (${res.status})`);
}

/** Thrown by addCompareMatrixEntry when the 5-entry cap is already hit. */
export class CompareLimitReachedError extends Error {
  constructor(message = "Compare limit reached") {
    super(message);
    this.name = "CompareLimitReachedError";
  }
}

/**
 * POST /compare/matrix/entry — atomically upserts one compare-matrix entry
 * (dedupe key: unitid + cipCode + credentialLevel). Safe for multiple
 * independent UI surfaces (search cards, Intelligent Matches, university
 * page, the /compare page's own filter) to call concurrently, unlike the
 * whole-list saveCompareMatrix. Returns the caller's full updated matrix.
 */
export async function addCompareMatrixEntry(entry: {
  unitid: string;
  cipCode?: string | null;
  credentialLevel?: string | number | null;
  programName?: string | null;
  credentialTitle?: string | null;
}): Promise<CompareMatrixEntry[]> {
  const res = await authedFetch("/compare/matrix/entry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (res.status === 409) throw new CompareLimitReachedError();
  if (!res.ok) throw new Error(`Add compare matrix entry failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? (data as CompareMatrixEntry[]) : [];
}

/**
 * One row from DELETE /compare/matrix/entry/... when called with
 * `withDetails: true` — the same matrix-entry identity fields as
 * CompareMatrixEntry, plus that row's own enriched `details` (identical
 * shape to a GET /compare/matrix/details row). Lets the /compare page
 * re-render the remaining rows straight off the delete response instead of
 * following up with a separate GET /compare/matrix/details round trip.
 */
export interface CompareMatrixEntryWithDetails extends CompareMatrixEntry {
  details: SelectedCompareCollege;
}

/**
 * DELETE /compare/matrix/entry/:unitid — removes every entry for a college
 * (no program given), or DELETE /compare/matrix/entry/:unitid/:cipCode/
 * :credentialLevel — removes one specific program entry. Returns the
 * caller's full updated matrix.
 *
 * Pass `{ withDetails: true }` to also get each remaining row's enriched
 * details inline (`?details=true`) — see CompareMatrixEntryWithDetails.
 */
export async function removeCompareMatrixEntry(
  unitid: string,
  program?: { cipCode: string; credentialLevel?: string | number },
): Promise<CompareMatrixEntry[]>;
export async function removeCompareMatrixEntry(
  unitid: string,
  program: { cipCode: string; credentialLevel?: string | number } | undefined,
  opts: { withDetails: true },
): Promise<CompareMatrixEntryWithDetails[]>;
export async function removeCompareMatrixEntry(
  unitid: string,
  program?: { cipCode: string; credentialLevel?: string | number },
  opts?: { withDetails?: boolean },
): Promise<CompareMatrixEntry[] | CompareMatrixEntryWithDetails[]> {
  const basePath = program
    ? `/compare/matrix/entry/${encodeURIComponent(unitid)}/${encodeURIComponent(program.cipCode)}/${encodeURIComponent(String(program.credentialLevel ?? ""))}`
    : `/compare/matrix/entry/${encodeURIComponent(unitid)}`;
  const path = opts?.withDetails ? `${basePath}?details=true` : basePath;
  const res = await authedFetch(path, { method: "DELETE" });
  if (!res.ok) throw new Error(`Remove compare matrix entry failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * GET /compare/matrix/details — enriched details for the caller's compare
 * matrix rows, same shape as fetchCompareSelected, but one row per matrix
 * entry (a college compared under two programs gets two rows) with each
 * row's own programs.selectedProgram already resolved from that row's own
 * cipCode/credentialLevel — no per-program round trip needed.
 */
export async function fetchCompareMatrixDetails(): Promise<
  SelectedCompareCollege[]
> {
  const res = await authedFetch("/compare/matrix/details");
  if (!res.ok)
    throw new Error(`Load comparison matrix details failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? (data as SelectedCompareCollege[]) : [];
}

// ---- Generated reports ------------------------------------------------------

/** A college entry as returned inside a report's `colleges` array. */
export interface ReportCollege {
  unitid: number;
  name: string;
}

/** A single report as returned by GET /report/:reportId (and the /report/generate response). */
export interface ReportDetail {
  reportId: string;
  createdAt: string;
  colleges: ReportCollege[];
  downloadUrl: string;
  expiresAt: string;
}

/** One row of the paginated GET /report list. */
export interface ReportSummary {
  reportId: string;
  createdAt: string;
  colleges: ReportCollege[];
}

export interface PaginatedReports {
  reports: ReportSummary[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/** GET /report?page=&limit= — the current user's report history (router mounted at /report, singular). */
export async function fetchReports(
  page = 1,
  limit = 10,
): Promise<PaginatedReports> {
  const res = await authedFetch(`/report?page=${page}&limit=${limit}`);
  return parseJson<PaginatedReports>(res, "Load reports");
}

/** GET /report/:reportId — a single report's metadata and a fresh signed download URL. */
export async function fetchReport(reportId: string): Promise<ReportDetail> {
  const res = await authedFetch(`/report/${encodeURIComponent(reportId)}`);
  if (res.status === 404) {
    throw new ReportNotFoundError(reportId);
  }
  return parseJson<ReportDetail>(res, "Load report");
}

export class ReportNotFoundError extends Error {
  constructor(reportId: string) {
    super(`Report ${reportId} not found`);
    this.name = "ReportNotFoundError";
  }
}

/**
 * POST /report/:reportId/email — asks the backend to email the signed
 * download link (plus report name/created date/compared colleges) to the
 * current user's registered address. Requires backend support — see the
 * NOTE above `emailReport`'s call site in MyReportsSection.tsx.
 */
export async function emailReport(reportId: string): Promise<void> {
  const res = await authedFetch(
    `/report/${encodeURIComponent(reportId)}/email`,
    { method: "POST" },
  );
  if (res.status === 404) {
    throw new ReportNotFoundError(reportId);
  }
  if (!res.ok) {
    throw new Error(`Email report failed (${res.status})`);
  }
}

// ---- Apply Now Click Analytics ----------------------------------------------

export interface TrackApplyClickPayload {
  universityId?: string | number | null;
  universityName?: string | null;
  cipCode?: string | null;
  degree?: string | null;
  credentialLevel?: number | null;
  credentialTitle?: string | null;
  schoolUrl?: string | null;
}

/**
 * POST /analytics/apply-click — records when a user (or guest) clicks 'Apply Now'.
 * Uses authedFetch so signed-in users automatically attach their Authorization header.
 */
export async function trackApplyClick(
  payload: TrackApplyClickPayload,
): Promise<void> {
  try {
    await authedFetch("/analytics/apply-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        university_id: payload.universityId ? String(payload.universityId) : null,
        university_name: payload.universityName ?? null,
        cip_code: payload.cipCode ?? null,
        degree: payload.degree ?? null,
        credential_level: payload.credentialLevel ?? null,
        credential_title: payload.credentialTitle ?? null,
        school_url: payload.schoolUrl ?? null,
        clicked_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("Failed to track Apply Now click:", err);
  }
}

/** One row of usd_apply_clicks, as returned by GET /analytics/apply-clicks. */
export interface ApplyClick {
  id: number;
  universityId: string | null;
  /** Institution name — the `university_name` column. */
  universityName: string | null;
  cipCode: string | null;
  /** Program name — the `degree` column. */
  degree: string | null;
  credentialLevel: number | null;
  /** Degree level label — the `credential_title` column. */
  credentialTitle: string | null;
  schoolUrl: string | null;
  clickedAt: string;
}

export interface PaginatedApplyClicks {
  clicks: ApplyClick[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * GET /analytics/apply-clicks?page=&limit= — the signed-in user's own
 * "Apply Now" click history (the read side of trackApplyClick above).
 */
export async function fetchApplyClicks(
  page = 1,
  limit = 10,
): Promise<PaginatedApplyClicks> {
  const res = await authedFetch(
    `/analytics/apply-clicks?page=${page}&limit=${limit}`,
  );
  return parseJson<PaginatedApplyClicks>(res, "Load applied list");
}

