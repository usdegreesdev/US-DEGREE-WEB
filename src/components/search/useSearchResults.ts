"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { CATEGORY_KEYWORDS } from "@/constants/searchCategories";
import { authedFetch, hasAuthenticatedUser } from "@/lib/auth/api";
import { buildSearchRequest, PAGE_SIZE_OPTIONS } from "@/lib/search/searchRequest";
import {
  MAX_PAGES,
  ANON_MAX_PAGE_SIZE,
  AUTH_MAX_PAGE_SIZE,
  classifySearchFailure,
  type SearchFailure,
} from "@/lib/search/searchParams";
import { filterSearchResults } from "@/lib/search/searchFilters";
import { SearchResult, ViewMode } from "@/types/search-details";

import { ServerSearchBundle } from "@/lib/search/searchServer";

const GRID_ITEMS_PER_PAGE = 12;
const LIST_ITEMS_PER_PAGE = 10;

export function useSearchResults(initialData?: ServerSearchBundle) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [results, setResults] = useState<SearchResult[]>(
    () => initialData?.results || [],
  );
  const [totalCount, setTotalCount] = useState<number | null>(
    () => initialData?.totalCount ?? null,
  );
  const [isServerPaginated, setIsServerPaginated] = useState<boolean>(
    () => initialData?.isServerPaginated || false,
  );
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [failure, setFailure] = useState<SearchFailure | null>(
    () => initialData?.failure ?? null,
  );
  // null until Firebase has restored the session. Treated as anonymous (the
  // stricter tier) meanwhile; the backend decides what each tier really gets.
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [retryNonce, setRetryNonce] = useState(0);
  const retry = useCallback(() => setRetryNonce((n) => n + 1), []);

  // SSR already fetched this exact bundle for the params the page loaded
  // with — skip the client's first fetch so hydration doesn't immediately
  // re-request and flash a skeleton. Any later param change (filter, page,
  // sort) goes through the effect normally.
  const usedInitial = useRef(Boolean(initialData));
  // Page size the SSR bundle was fetched with (anonymous-capped).
  const initialPageSize = useRef(initialData?.itemsPerPage ?? 0);

  const defaultItemsPerPage =
    viewMode === "grid" ? GRID_ITEMS_PER_PAGE : LIST_ITEMS_PER_PAGE;
  const perPageParam = parseInt(searchParams.get("per_page") || "", 10);
  const itemsPerPage = (PAGE_SIZE_OPTIONS as readonly number[]).includes(
    perPageParam,
  )
    ? perPageParam
    : defaultItemsPerPage;
  // What the backend will actually return per page for this visitor. It
  // enforces the cap; we mirror it so page counts match the rows we get.
  const maxPageSize = isAuthed ? AUTH_MAX_PAGE_SIZE : ANON_MAX_PAGE_SIZE;
  const effectivePageSize = Math.min(itemsPerPage, maxPageSize);
  const category = searchParams.get("category") || "";

  // Derive current page from URL parameter (default: 1)
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page > 1) {
        params.set("page", String(page));
      } else {
        params.delete("page");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  // Changing how many results are shown per page also resets to page 1 —
  // otherwise the user could land on a page past the new, shorter total.
  const handlePageSizeChange = useCallback(
    (size: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (size === defaultItemsPerPage) {
        params.delete("per_page");
      } else {
        params.set("per_page", String(size));
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, defaultItemsPerPage],
  );

  useEffect(() => {
    const controller = new AbortController();

    const fetchResults = async () => {
      const authed = await hasAuthenticatedUser();
      if (controller.signal.aborted) return;
      setIsAuthed(authed);
      const pageSize = Math.min(
        itemsPerPage,
        authed ? AUTH_MAX_PAGE_SIZE : ANON_MAX_PAGE_SIZE,
      );

      // SSR already fetched this exact bundle for the params the page loaded
      // with — skip the first fetch so hydration doesn't immediately
      // re-request and flash a skeleton. Not when a signed-in visitor wants a
      // bigger page than the anonymous SSR render could return. Any later
      // param change (filter, page, sort) goes through normally.
      if (usedInitial.current) {
        usedInitial.current = false;
        if (pageSize === initialPageSize.current) return;
      }

      window.scrollTo(0, 0);
      setIsLoading(true);
      try {
        const { requestParams } =
          buildSearchRequest(searchParams, category, currentPage, pageSize);

        // Attaches the user's token when signed in (the backend's authed tier);
        // falls back to a plain anonymous request otherwise.
        const res = await authedFetch(`/search?${requestParams.toString()}`, {
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          let rawResults: SearchResult[] = [];
          let serverTotal: number | null = null;
          let serverPaginated = false;

          if (Array.isArray(data)) {
            rawResults = data;
          } else if (data && typeof data === "object") {
            if (Array.isArray(data.results)) {
              rawResults = data.results;
              serverPaginated = true;
            }
            if (typeof data.total === "number") {
              serverTotal = data.total;
            } else if (typeof data.count === "number") {
              serverTotal = data.count;
            }
          }

          const filteredData = filterSearchResults(rawResults, {
            schoolType: searchParams.get("school_type"),
            categoryKeywords: category ? CATEGORY_KEYWORDS[category] : null,
          });

          setResults(filteredData);
          setTotalCount(serverTotal);
          setIsServerPaginated(serverPaginated);
          setFailure(null);
        } else {
          // A non-OK response must not look like a legitimate zero-hit
          // search — clear stale results and record why it failed so the UI
          // says that (rate limit, page-depth cap, ...) instead of "No
          // results found". The backend's status is authoritative.
          setResults([]);
          setTotalCount(null);
          setIsServerPaginated(false);
          setFailure(classifySearchFailure(res.status, currentPage));
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Search failed:", err);
          setResults([]);
          setTotalCount(null);
          setIsServerPaginated(false);
          setFailure("generic");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      controller.abort();
    };
  }, [searchParams, category, currentPage, itemsPerPage, retryNonce]);

  const rawPages = Math.ceil(
    (totalCount !== null ? totalCount : results.length) / effectivePageSize,
  );
  // The backend won't serve past page 25 to anyone; stop the pager there and
  // tell the visitor to narrow the search instead.
  const depthLimited = rawPages > MAX_PAGES;
  let totalPages = Math.max(
    1,
    depthLimited ? MAX_PAGES : rawPages,
  );
  // Past the cap the backend returns no total; keep the pager usable so the
  // visitor can step back.
  if (failure === "depth_limit") totalPages = Math.max(totalPages, MAX_PAGES);

  const currentResults = isServerPaginated
    ? results
    : results.slice(
        (currentPage - 1) * effectivePageSize,
        currentPage * effectivePageSize,
      );

  return {
    isLoading,
    failure,
    retry,
    currentPage,
    setCurrentPage: handlePageChange,
    viewMode,
    setViewMode,
    totalPages,
    depthLimited,
    currentResults,
    category,
    pageSize: effectivePageSize,
    pageSizeOptions: pageSizeOptionsFor(maxPageSize),
    setPageSize: handlePageSizeChange,
  };
}

/** Page sizes the visitor can actually get: the standard ones up to their cap. */
function pageSizeOptionsFor(cap: number): number[] {
  const options = PAGE_SIZE_OPTIONS.filter((size) => size <= cap) as number[];
  return options.includes(cap) ? options : [...options, cap];
}
