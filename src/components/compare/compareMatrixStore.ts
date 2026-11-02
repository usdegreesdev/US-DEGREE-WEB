"use client";

/**
 * SINGLE SOURCE OF TRUTH for "colleges queued for comparison" — program-aware
 * and page-agnostic. Every add-to-compare surface (search cards, the profile's
 * Intelligent Matches card, the university page, and the /compare page's own
 * filter) goes through this module so they share one implementation instead
 * of drifting, as the old college-level-only `compareStore.ts` did.
 *
 * Canonical state lives on the backend (`/compare/matrix`); mirrored in
 * localStorage (MATRIX_ENTRIES_KEY, owned by writeMatrixEntries in
 * ./compareEntryIds) for instant, SSR-safe reads. There is deliberately no
 * separate in-memory cache of the id list here — every read goes straight to
 * localStorage, the same pattern useCompareCount.ts already uses, so there's
 * nothing that can go stale relative to it.
 *
 * Adds/removes go through the atomic POST/DELETE /compare/matrix/entry
 * endpoints (not the whole-list PUT /compare/matrix), so multiple independent
 * UI surfaces mutating concurrently can't clobber each other's rows on the
 * BACKEND. But each call still writes its own full response into the local
 * mirror — so two mutations fired close together (e.g. removing two colleges
 * in quick succession) could still race on the CLIENT: whichever response
 * happens to resolve last wins, even if it was actually the earlier-
 * initiated call whose response was computed before the other removal had
 * landed. `enqueueMutation` below serializes every add/remove/clear through
 * this module so they always run — and their responses always get applied —
 * in the order they were called, eliminating that race entirely.
 */

import { useEffect, useState } from "react";
import {
  fetchCompareMatrix,
  saveCompareMatrix,
  addCompareMatrixEntry,
  removeCompareMatrixEntry,
  CompareLimitReachedError,
  hasAuthenticatedUser,
  type SelectedCompareCollege,
} from "@/lib/auth/api";
import {
  makeEntryId,
  parseEntryId,
  apiEntriesToMatrixIds,
  apiEntriesToPrograms,
  readEntryPrograms,
  writeEntryPrograms,
  writeMatrixEntries,
} from "./compareEntryIds";
import {
  MATRIX_ENTRIES_KEY,
  MATRIX_UPDATED_EVENT,
  MATRIX_OWNER_CHANGED_EVENT,
} from "@/hooks/useCompareCount";

export const MAX_COMPARE = 5;
const OWNER_KEY = "compare_matrix_owner";

export type AddResult = "added" | "exists" | "full";

export interface CollegeProgramDetail {
  unitid: string;
  cipCode?: string;
  credentialLevel?: number | string;
  programName?: string;
  credentialTitle?: string;
  // College fields — only consumed for the anonymous local-storage path (see
  // addEntryLocally); the backend enriches signed-in adds by unitid itself.
  name?: string;
  location?: string;
  schoolType?: string;
  schoolUrl?: string;
}

let loaded = false;
let inflight: Promise<void> | null = null;

// Serializes add/remove/clear so their network calls (and, critically, the
// local-mirror writes derived from their responses) always run in the order
// they were invoked — see the module doc comment above.
let mutationQueue: Promise<unknown> = Promise.resolve();
function enqueueMutation<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(fn, fn);
  // Keep the queue alive even if this mutation rejects — swallow the error
  // here only for chaining purposes; `result` still carries it to the caller.
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function readEntries(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(MATRIX_ENTRIES_KEY) || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

// ---- Synchronous getters ----
export function getCompareEntryIds(): string[] {
  return readEntries();
}
export function getCompareCount(): number {
  return readEntries().length;
}
export function isCollegeCompared(unitid: string): boolean {
  const id = String(unitid);
  return readEntries().some((e) => parseEntryId(e).unitid === id);
}

// Tag the mirror with the signed-in user's id, dropping it whenever that id
// changes — otherwise the browser-scoped mirror leaks one account's picks
// into whichever account signs in next on the same browser. This also
// applies to an anonymous visitor (owner "") signing in: /compare is public
// now, so a visitor can build up a local-only selection before logging in,
// but on login the page should show that ACCOUNT's own already-saved
// comparison, not silently merge in whatever was picked while signed out —
// so the local-only picks are dropped here rather than pushed to the backend.
export function syncCompareMatrixOwner(ownerId: string | number | null): void {
  if (typeof window === "undefined") return;
  const key = ownerId != null ? String(ownerId) : "";
  const previousKey = localStorage.getItem(OWNER_KEY);
  if (previousKey === key) return;

  loaded = false;
  writeMatrixEntries([]);
  writeEntryPrograms({});
  localStorage.setItem(OWNER_KEY, key);

  // Only an actual transition (not this browser's very first visit, when
  // there's no previous owner to switch away from) should blow away a
  // compare-page URL — otherwise a brand-new visitor opening a shared
  // /compare?ids=... link would immediately have it wiped out from under
  // them. See useCompareColleges.ts's listener for the URL-reset side.
  if (previousKey !== null) {
    window.dispatchEvent(new Event(MATRIX_OWNER_CHANGED_EVENT));
  }
}

// Load the backend matrix once (authoritative), reconciling the mirror.
export async function ensureMatrixLoaded(): Promise<void> {
  if (loaded) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      if (!(await hasAuthenticatedUser())) return;
      const backendEntries = await fetchCompareMatrix();
      const backendIds = apiEntriesToMatrixIds(backendEntries);
      // Union with whatever's already local — an add can land while this
      // load is in flight, and the backend list alone would silently drop it.
      const ids = Array.from(new Set([...backendIds, ...readEntries()])).slice(
        0,
        MAX_COMPARE,
      );
      writeMatrixEntries(ids);
      writeEntryPrograms({
        ...apiEntriesToPrograms(backendEntries),
        ...readEntryPrograms(),
      });
      loaded = true;
    } catch (err) {
      console.error("Failed to load comparison matrix:", err);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// Force a reload from the backend (bypassing the `loaded` cache) — needed
// whenever another surface may have mutated the backend matrix behind this
// module's back, or the cached load happened before a college was added.
export async function reloadMatrix(): Promise<void> {
  loaded = false;
  return ensureMatrixLoaded();
}

// Write one entry into the local-only mirror (no backend call) — used for
// anonymous visitors on the now-public /compare page. Kept in the same
// MATRIX_ENTRIES_KEY/ENTRY_PROGRAMS_KEY shape as the backend-backed path so
// everything downstream (URL sync, badge count, detail rendering) works the
// same regardless of auth state. Dropped (not replayed) on sign-in — see
// syncCompareMatrixOwner.
function addEntryLocally(
  unitid: string,
  cipCode: string,
  entryId: string,
  detail: CollegeProgramDetail,
): AddResult {
  const entries = readEntries();
  if (entries.includes(entryId)) return "exists";
  if (entries.length >= MAX_COMPARE) return "full";

  writeMatrixEntries([...entries, entryId]);

  // Persist whatever college/program info the caller had on hand — search
  // cards, Intelligent Matches, and the university page all know the
  // college's name/location even though there's no backend matrix to fetch
  // it back from yet (see buildCollegeRow's use of entryProgramsMap).
  const hasProgramInfo = cipCode !== "default" && !!detail.programName;
  const hasCollegeInfo =
    !!detail.name || !!detail.location || !!detail.schoolType || !!detail.schoolUrl;
  if (hasProgramInfo || hasCollegeInfo) {
    writeEntryPrograms({
      ...readEntryPrograms(),
      [entryId]: {
        programName: hasProgramInfo ? detail.programName! : "",
        credentialTitle: hasProgramInfo ? detail.credentialTitle || "" : "",
        name: detail.name,
        location: detail.location,
        schoolType: detail.schoolType,
        schoolUrl: detail.schoolUrl,
      },
    });
  }
  return "added";
}

// Add a college (optionally scoped to a specific program) to the comparison
// matrix. Returns "full" once the 5-entry cap is hit (enforced server-side
// when signed in, mirrored client-side for anonymous visitors), "exists" for
// an exact duplicate (same college + same course + same credential level)
// caught locally before ever hitting the network.
export function addCollegeToCompare(
  detail: CollegeProgramDetail,
): Promise<AddResult> {
  return enqueueMutation(async () => {
    const unitid = String(detail.unitid);
    if (!unitid) return "exists";
    const cipCode = detail.cipCode || "default";
    const entryId = makeEntryId(unitid, cipCode, detail.credentialLevel);

    if (readEntries().includes(entryId)) return "exists";

    // Anonymous visitor (compare is public): keep the selection local until
    // they sign in — there is no backend matrix to write to yet.
    if (!(await hasAuthenticatedUser())) {
      return addEntryLocally(unitid, cipCode, entryId, detail);
    }

    try {
      const backendEntries = await addCompareMatrixEntry({
        unitid,
        cipCode: cipCode === "default" ? null : cipCode,
        credentialLevel: detail.credentialLevel ?? null,
        programName: detail.programName ?? null,
        credentialTitle: detail.credentialTitle ?? null,
      });
      writeMatrixEntries(apiEntriesToMatrixIds(backendEntries));
      writeEntryPrograms(apiEntriesToPrograms(backendEntries));
    } catch (err) {
      if (err instanceof CompareLimitReachedError) return "full";
      throw err;
    }
    return "added";
  });
}

// Remove a college from the matrix. With no `opts`, removes every entry for
// that college (used by the plain toggle-off on search/profile/university
// cards, which don't know/care about a specific program). With `opts.cipCode`,
// removes only that one program entry (used by the /compare page's own
// per-program remove).
//
// With `opts.withDetails`, the signed-in path asks the backend for each
// remaining row's enriched details inline (same shape as
// GET /compare/matrix/details) instead of just the bare matrix entry — the
// /compare page uses this to redraw the table straight off the delete
// response, skipping the separate details round trip it used to make right
// after. Returns `{ ids, details }` (in matching order) when that enrichment
// is available, otherwise null (anonymous visitors, or `withDetails` not
// requested) — callers fall back to their own bookkeeping in that case.
export function removeCollegeFromCompare(
  unitid: string,
  opts?: {
    cipCode?: string;
    credentialLevel?: number | string;
    withDetails?: boolean;
  },
): Promise<{ ids: string[]; details: SelectedCompareCollege[] } | null> {
  return enqueueMutation(async () => {
    const id = String(unitid);

    if (!(await hasAuthenticatedUser())) {
      const remaining = readEntries().filter((entryId) => {
        const parsed = parseEntryId(entryId);
        if (parsed.unitid !== id) return true;
        if (!opts?.cipCode) return false;
        return (
          parsed.cipCode !== opts.cipCode ||
          String(parsed.credentialLevel ?? "") !==
            String(opts.credentialLevel ?? "")
        );
      });
      writeMatrixEntries(remaining);
      const programs = readEntryPrograms();
      const remainingSet = new Set(remaining);
      writeEntryPrograms(
        Object.fromEntries(
          Object.entries(programs).filter(([entryId]) =>
            remainingSet.has(entryId),
          ),
        ),
      );
      return null;
    }

    const program = opts?.cipCode
      ? { cipCode: opts.cipCode, credentialLevel: opts.credentialLevel }
      : undefined;

    if (opts?.withDetails) {
      const backendEntries = await removeCompareMatrixEntry(id, program, {
        withDetails: true,
      });
      writeMatrixEntries(apiEntriesToMatrixIds(backendEntries));
      writeEntryPrograms(apiEntriesToPrograms(backendEntries));
      return {
        ids: apiEntriesToMatrixIds(backendEntries),
        details: backendEntries.map((e) => e.details),
      };
    }

    const backendEntries = await removeCompareMatrixEntry(id, program);
    writeMatrixEntries(apiEntriesToMatrixIds(backendEntries));
    writeEntryPrograms(apiEntriesToPrograms(backendEntries));
    return null;
  });
}

// Clear the entire comparison matrix. Still queued alongside add/remove even
// though the whole-list PUT itself has no concurrent-mutation hazard —
// otherwise a clear racing an in-flight add/remove could still land out of
// order on the client.
export function clearCompare(): Promise<void> {
  return enqueueMutation(async () => {
    const prevIds = readEntries();
    writeMatrixEntries([]);
    writeEntryPrograms({});

    if (!(await hasAuthenticatedUser())) return;

    try {
      await saveCompareMatrix([]);
    } catch (err) {
      writeMatrixEntries(prevIds);
      throw err;
    }
  });
}

// Toggle a college's membership (any program); returns the resulting action.
export async function toggleCompare(
  detail: CollegeProgramDetail,
): Promise<AddResult | "removed"> {
  if (isCollegeCompared(detail.unitid)) {
    await removeCollegeFromCompare(detail.unitid);
    return "removed";
  }
  return addCollegeToCompare(detail);
}

// ---- React hooks ----

// `initial` is what the server (and the first client render) shows, so hydration
// matches; the effect below then syncs to the real client-side store.
function useCompareMatrixSync<T>(
  read: () => T,
  deps: unknown[],
  initial: T,
): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    ensureMatrixLoaded();
    const handler = () => setValue(read());
    handler();
    window.addEventListener(MATRIX_UPDATED_EVENT, handler);
    return () => window.removeEventListener(MATRIX_UPDATED_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

/** Reactive "is this college (any program) currently compared" state. */
export function useIsCollegeCompared(unitid?: string | null): boolean {
  return useCompareMatrixSync(
    () => (unitid ? isCollegeCompared(unitid) : false),
    [unitid],
    false,
  );
}

/** Reactive list of compared entry ids, for components rendering the whole set. */
export function useCompareEntryIds(): string[] {
  return useCompareMatrixSync<string[]>(getCompareEntryIds, [], []);
}
