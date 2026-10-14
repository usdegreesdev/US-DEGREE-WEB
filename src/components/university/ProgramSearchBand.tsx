"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface ProgramResult {
  title: string;
  cip_code: string;
  credential_title: string;
  credential_level: number;
  degree_level_category: string;
}

interface CredentialOption {
  credential_title: string;
  credential_level: number;
}

interface ProgramSearchBandProps {
  universityId: string;
  universityName?: string;
  location?: string;
  schoolType?: string;
  admissionRate?: string | number | null;
  tuitionFee?: string | number | null;
  avgSalary?: number | null;
  netRoi20Yr?: string | number | null;
}

const DEBOUNCE_MS = 300;

export default function ProgramSearchBand({
  universityId,
  universityName,
  location,
  schoolType,
  admissionRate,
  tuitionFee,
  avgSalary,
  netRoi20Yr,
}: ProgramSearchBandProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [credentialTitle, setCredentialTitle] = useState("all");
  const [credentialOptions, setCredentialOptions] = useState<
    CredentialOption[]
  >([]);
  const [results, setResults] = useState<ProgramResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [errored, setErrored] = useState(false);
  const [navigatingKey, setNavigatingKey] = useState<string | null>(null);
  // Pending state resets on its own once the navigation settles, so the result
  // buttons are never left permanently disabled (the page stays mounted when
  // only the query string changes).
  const [isNavigating, startTransition] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  // Load the set of credential levels (Bachelor's, Master's, ...) that
  // actually exist at this university, so the dropdown never offers a
  // filter that would return zero results.
  useEffect(() => {
    if (!universityId) return;
    fetch(`/api/proxy/schools/${universityId}/programs/credentials`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const items: CredentialOption[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.credentials)
            ? data.credentials
            : [];
        setCredentialOptions(items);
      })
      .catch(() => setCredentialOptions([]));
  }, [universityId]);

  const runSearch = () => {
    if (!universityId) return;
    const requestId = ++requestIdRef.current;

    // Fade the current results out before swapping so the list never pops.
    setVisible(false);

    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (credentialTitle !== "all")
      params.set("credential_title", credentialTitle);
    params.set("limit", "6");

    fetch(`/api/proxy/schools/${universityId}/programs?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        const items: ProgramResult[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.programs)
            ? data.programs
            : [];
        setResults(items);
        setErrored(false);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setResults([]);
        setErrored(true);
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setLoading(false);
        // Let the DOM update with the new (empty-opacity) content first, then fade in.
        requestAnimationFrame(() => setVisible(true));
      });
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      runSearch();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, credentialTitle, universityId]);

  const handleFindClick = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    runSearch();
  };

  // Mirrors the query shape search results use to link into `/university/[id]`
  // (see ResultCard's `universityHref`) so the program detail page renders with
  // the same full context instead of just the bare CIP code.
  const handleResultClick = (program: ProgramResult) => {
    setNavigatingKey(
      `${program.cip_code}-${program.title}-${program.credential_title}`,
    );
    const [city = "", state = ""] = (location || "").split(", ");
    const params = new URLSearchParams();
    params.set("cip", program.cip_code);
    if (universityName) params.set("name", universityName);
    if (city) params.set("city", city);
    if (state) params.set("state", state);
    params.set("degree", program.title);
    params.set("credentialTitle", program.credential_title);
    if (schoolType) params.set("type", schoolType);
    if (admissionRate != null)
      params.set("admissionRate", String(admissionRate));
    if (tuitionFee != null) params.set("tuition", String(tuitionFee));
    if (avgSalary != null) params.set("avgSalary", String(avgSalary));
    if (netRoi20Yr != null) params.set("roi", String(netRoi20Yr));

    startTransition(() => {
      router.push(`/university/${universityId}?${params.toString()}`);
    });
  };

  const hasSearched = searchQuery.trim() !== "" || credentialTitle !== "all";

  const searchForm = (
    <div className="mt-6 flex flex-col gap-3">
      <label className="flex min-h-12 items-center gap-2 rounded-[8px] border border-[#DDE7F0] bg-white px-4 shadow-sm">
        <Search size={14} className="shrink-0 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by keyword (e.g. Physics, Data Science...)"
          className="w-full bg-transparent text-[11px] font-medium text-gray-700 outline-none placeholder:text-gray-400"
        />
      </label>

      <select
        value={credentialTitle}
        onChange={(event) => setCredentialTitle(event.target.value)}
        className="min-h-12 rounded-[8px] border border-[#DDE7F0] bg-white px-4 text-[11px] font-semibold text-gray-600 shadow-sm outline-none"
      >
        <option value="all">Degree Level</option>
        {credentialOptions.map((option) => (
          <option key={option.credential_title} value={option.credential_title}>
            {option.credential_title}
          </option>
        ))}
      </select>

      <button
        onClick={handleFindClick}
        className="min-h-12 rounded-[8px] bg-[#2563EB] px-8 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]"
      >
        Find
      </button>
    </div>
  );

  const resultsList = (
    <>
      {loading && results.length === 0 && (
        <p className="col-span-full text-xs font-medium text-gray-400">
          Searching programs...
        </p>
      )}

      {!loading && errored && (
        <p className="col-span-full text-xs font-medium text-gray-400">
          Unable to load programs right now.
        </p>
      )}

      {!loading && !errored && results.length === 0 && (
        <p className="col-span-full text-xs font-medium text-gray-400">
          No programs found for this search.
        </p>
      )}

      {results.map((program) => {
        const key = `${program.cip_code}-${program.title}-${program.credential_title}`;
        const isThisNavigating = isNavigating && navigatingKey === key;
        return (
          <button
            key={key}
            onClick={() => handleResultClick(program)}
            disabled={isNavigating}
            className="group flex min-h-[58px] items-center justify-between rounded-[8px] bg-white px-4 text-left shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              <span className="block text-[11px] font-black leading-tight text-gray-950">
                {program.title}
              </span>
              <span className="mt-1 block text-[9px] font-semibold text-gray-400">
                {program.credential_title}
              </span>
            </span>
            {isThisNavigating ? (
              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            ) : (
              <span className="text-sm font-black text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600">
                &gt;
              </span>
            )}
          </button>
        );
      })}
    </>
  );

  return (
    <section className="bg-[#EAF6FF] px-6 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div
          className={`grid grid-cols-1 gap-8 transition-[grid-template-columns] duration-500 ease-out ${
            hasSearched
              ? "lg:[grid-template-columns:380px_1fr]"
              : "lg:[grid-template-columns:1fr_0fr]"
          }`}
        >
          {/* Left: heading + search form */}
          <div
            className={`transition-[max-width] duration-500 ease-out ${
              hasSearched ? "" : "lg:mx-auto lg:max-w-xl lg:text-center"
            }`}
          >
            <h2 className="text-2xl font-black text-gray-950">
              Search All Programs
            </h2>
            <p className="mt-2 text-xs font-medium text-gray-500">
              Explore the complete catalog of{" "}
              {universityName || "this university"}&apos;s academic offerings.
            </p>

            {searchForm}
          </div>

          {/* Right: results (large screens only reveal after a search) */}
          <div
            className={`grid grid-cols-1 content-start gap-3 overflow-hidden transition-opacity duration-500 ease-out sm:grid-cols-2 ${
              visible ? "opacity-100" : "opacity-0"
            } ${hasSearched && visible ? "lg:opacity-100" : "lg:opacity-0"}`}
          >
            {resultsList}
          </div>
        </div>
      </div>
    </section>
  );
}
