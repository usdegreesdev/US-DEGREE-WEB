/**
 * College matchmaking for the Profile Dashboard.
 *
 * Matches are driven entirely by the student's saved preferences — target
 * states and target majors/curriculums — and pulled from the live backend
 * (NO mock/seed data). For each preferred major we query GET /search (which
 * filters by `title` and `state`), merge + de-duplicate the results, then
 * enrich the top few colleges with graduation rate and 1-year median salary
 * from GET /overview and GET /outcomes (those two fields aren't in /search).
 *
 * Every numeric field is nullable: when the backend has no value the tile
 * renders "N/A" rather than a fabricated number.
 */

"use client";

import { useState, useEffect } from "react";
import { authedFetch } from "@/lib/auth/api";
import { StudentProfile } from "../../types/profile";
import { SearchResult } from "../../types/search-details";
import { extractSearchRows } from "../../lib/search/searchParams";
import { EarningsFillMethod } from "@/types/earningsMethod";

/** A single matched college, ready to render. Rates are percentages (0–100). */
export interface CollegeMatch {
  id: string; // unitid (also used as the React key / save+compare id)
  unitid: string;
  name: string;
  city: string;
  state: string;
  cipCode: string;
  programTitle: string; // the matched major/curriculum
  degreeLevel: string; // credential level for that program (e.g. "Bachelor's Degree")
  credentialLevel: number | null; // IPEDS credential level code (e.g. 5/7/17), disambiguates cipCode + degreeLevel
  isPrivate: boolean;
  tuition: number | null; // in-state tuition, $/yr
  costOfAttendance: number | null; // sticker_price_by_api — avg annual cost, $/yr
  acceptanceRate: number | null; // %
  graduationRate: number | null; // %
  employmentRate: number | null; // %
  medianSalary1yr: number | null; // 1-year median salary, $
  medianSalary1yrMethod: EarningsFillMethod | null;
  schoolUrl: string | null; // official website (for the Saved Colleges "Visit website")
}

// How many match tiles to show (and therefore enrich).
const TARGET_MATCHES = 10;

// Distribute `total` slots across `n` buckets as evenly as possible, giving the
// remainder to the earliest buckets. e.g. allocate(10, 2) -> [5, 5];
// allocate(10, 1) -> [10]; allocate(10, 3) -> [4, 3, 3].
function allocate(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  let rem = total % n;
  return Array.from({ length: n }, () => base + (rem-- > 0 ? 1 : 0));
}

// Round-robin rows across their state so no single state dominates and every
// preferred state gets represented before any state gets a second pick. With a
// single state this is a no-op (all rows are that state).
function interleaveByState(rows: SearchResult[]): SearchResult[] {
  const byState = new Map<string, SearchResult[]>();
  for (const r of rows) {
    const key = String(r.state ?? "").toUpperCase();
    const bucket = byState.get(key);
    if (bucket) bucket.push(r);
    else byState.set(key, [r]);
  }
  const buckets = Array.from(byState.values());
  const out: SearchResult[] = [];
  for (let i = 0; out.length < rows.length; i++) {
    let progressed = false;
    for (const b of buckets) {
      if (b[i]) {
        out.push(b[i]);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return out;
}

// Parse a numeric API value, returning null for anything non-numeric.
function toNum(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isNaN(num) ? null : num;
}

// Salaries arrive as numbers, numeric strings, or sentinel strings ("No Value",
// "N/A", "null"). Return a clean number or null.
function sanitizeSalary(
  val: number | string | null | undefined,
): number | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (
    str === "" ||
    str === "No Value" ||
    str === "N/A" ||
    str.toLowerCase() === "null"
  ) {
    return null;
  }
  const num = Number(str.replace(/[^0-9.-]/g, ""));
  return Number.isNaN(num) ? null : num;
}

// Normalise a rate to a 0–100 percentage. `admission_rate`/`emp_factor` arrive
// as 0–1 fractions, while `completion_rate` is already 0–100, so anything <= 1
// is scaled up.
function toPercent(val: number | string | null | undefined): number | null {
  const num = toNum(val);
  if (num === null) return null;
  return num <= 1 ? num * 100 : num;
}

/**
 * Reactive college matches for a profile. Re-runs whenever the user's target
 * states or majors change. Returns the matches and a loading flag.
 */
export function useCollegeMatches(profile: StudentProfile): {
  matches: CollegeMatch[];
  loading: boolean;
} {
  const [matches, setMatches] = useState<CollegeMatch[]>([]);
  const [loading, setLoading] = useState(false);

  const states = profile.preferredStates;
  const programs = profile.preferredPrograms;
  const collegeType = profile.preferredCollegeType;
  const degreeLevel = profile.preferredDegreeLevel;
  // Primitive deps so the effect only re-runs on actual preference changes.
  const statesKey = states.join(",");
  const programsKey = programs.join(",");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // No preferences yet → nothing to match on.
      if (programs.length === 0 && states.length === 0) {
        setMatches([]);
        return;
      }

      setLoading(true);
      try {
        // 1. Query /search once per preferred major (or once with no title when
        //    only states are set). We send the preferred states to narrow the result
        //    set server-side.
        const queries = programs.length > 0 ? programs : [""];
        const resultArrays = await Promise.all(
          queries.map(async (major) => {
            const params = new URLSearchParams();
            if (major) params.set("title", major);
            if (states.length > 0) params.set("state", states.join(","));
            if (degreeLevel) params.set("credential_title", degreeLevel);
            try {
              const res = await authedFetch(`/search?${params.toString()}`);
              if (!res.ok) return [];
              return extractSearchRows<SearchResult>(await res.json());
            } catch {
              return [];
            }
          }),
        );

        // Shared row filter. Preferred states are applied by the API (the
        // comma-separated `state` param above); here only the college type
        // is narrowed. Applied per major so each major's quota is filled from
        // its own filtered pool.
        const wantPrivate = collegeType
          ? collegeType.toLowerCase() === "private"
          : null;
        const passesFilters = (r: SearchResult): boolean => {
          if (wantPrivate !== null) {
            const isPrivate = String(r.college_type ?? r.school_type ?? "")
              .toLowerCase()
              .includes("private");
            if (isPrivate !== wantPrivate) return false;
          }
          // The credential_title query param narrows /search server-side, but
          // isn't guaranteed authoritative for every row, so also enforce it
          // client-side to keep mismatched degree levels out of the matches.
          if (
            degreeLevel &&
            (r.credential_title ?? "").toLowerCase() !==
              degreeLevel.toLowerCase()
          ) {
            return false;
          }
          return true;
        };

        // One filtered + state-interleaved pool per query (major). When only
        // states are set there is a single pool (the "" query).
        const perMajorPools = resultArrays.map((arr) =>
          interleaveByState(arr.filter(passesFilters)),
        );

        // Give each major an even share of the 10 slots: 2 majors -> 5 each,
        // 1 major (or states-only) -> 10.
        const quotas = allocate(TARGET_MATCHES, perMajorPools.length);

        const seen = new Set<string>();
        const unique: SearchResult[] = [];

        // Pass 1: take up to each major's quota, de-duplicating across majors.
        perMajorPools.forEach((pool, idx) => {
          let taken = 0;
          for (const r of pool) {
            if (taken >= quotas[idx]) break;
            const id = String(r.unitid ?? "");
            if (!id || seen.has(id)) continue;
            seen.add(id);
            unique.push(r);
            taken++;
          }
        });

        // Pass 2: backfill from any leftovers so we still reach 10 when a major
        // was short on results.
        if (unique.length < TARGET_MATCHES) {
          for (const pool of perMajorPools) {
            for (const r of pool) {
              if (unique.length >= TARGET_MATCHES) break;
              const id = String(r.unitid ?? "");
              if (!id || seen.has(id)) continue;
              seen.add(id);
              unique.push(r);
            }
            if (unique.length >= TARGET_MATCHES) break;
          }
        }

        const base: CollegeMatch[] = unique.slice(0, TARGET_MATCHES).map((r) => ({
          id: String(r.unitid),
          unitid: String(r.unitid),
          name: r.school_name || "Unknown University",
          city: r.city ?? "",
          state: r.state ?? "",
          cipCode: r.cip_code || "default",
          programTitle: r.program_title ?? "",
          degreeLevel: r.credential_title ?? "",
          credentialLevel: r.credential_level ?? null,
          isPrivate: String(r.college_type ?? r.school_type ?? "")
            .toLowerCase()
            .includes("private"),
          tuition: toNum(r.tuition_in_state),
          costOfAttendance: null, // filled in by the enrichment pass below
          acceptanceRate: toPercent(r.admission_rate),
          employmentRate: toPercent(r.emp_factor),
          graduationRate: null, // filled in by the enrichment pass below
          medianSalary1yr: null,
          medianSalary1yrMethod: null,
          schoolUrl: r.school_url ?? null,
        }));

        // Show the base tiles immediately; grad rate + 1-yr salary stream in.
        if (!cancelled) setMatches(base);

        // 2. Enrich each shown college with graduation rate (completion_rate)
        //    and 1-year median salary (earnings.year_1), which /search omits.
        const enriched = await Promise.all(
          base.map(async (m) => {
            try {
              const [ovRes, outRes, tuitionRes] = await Promise.all([
                authedFetch(`/overview/${m.id}/${m.cipCode}`),
                authedFetch(`/outcomes/${m.id}/${m.cipCode}`),
                authedFetch(`/tuition/${m.id}`),
              ]);

              let graduationRate: number | null = null;
              let medianSalary1yr: number | null = null;
              let medianSalary1yrMethod: EarningsFillMethod | null = null;
              let costOfAttendance: number | null = null;

              if (ovRes.ok) {
                const ov = await ovRes.json();
                graduationRate = toPercent(ov?.completion?.completion_rate);
                medianSalary1yr = sanitizeSalary(ov?.earnings?.year_1);
                medianSalary1yrMethod = ov?.earnings?.year_1_method ?? null;
              }
              if (outRes.ok) {
                const out = await outRes.json();
                // Prefer the cohort-resolved year_1 figure over the legacy
                // flat `earnings.year_1` — the latter reflects whichever
                // grad_cohort row happened to come back first, not
                // necessarily the best-available one for this horizon.
                const resolvedYear1 = out?.earnings_resolved?.year_1;
                medianSalary1yr =
                  sanitizeSalary(resolvedYear1?.value) ??
                  sanitizeSalary(out?.earnings?.year_1) ??
                  medianSalary1yr;
                medianSalary1yrMethod =
                  resolvedYear1?.method ??
                  out?.earnings?.year_1_method ??
                  medianSalary1yrMethod;
              }
              if (tuitionRes.ok) {
                const tui = await tuitionRes.json();
                // Same value the Tuition & Costs tab shows as "Average Annual
                // Cost of Attendance" — used as the fallback when a program has
                // no listed tuition.
                costOfAttendance = toNum(tui?.tuition?.sticker_price_by_api);
              }

              return {
                ...m,
                graduationRate,
                medianSalary1yr,
                medianSalary1yrMethod,
                costOfAttendance,
              };
            } catch {
              return m;
            }
          }),
        );

        if (!cancelled) setMatches(enriched);
      } catch (err) {
        console.error("Failed to compute college matches:", err);
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statesKey, programsKey, collegeType, degreeLevel]);

  return { matches, loading };
}
//
