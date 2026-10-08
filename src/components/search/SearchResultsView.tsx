"use client";

import ResultCard from "./ResultCard";
import TileCard from "./TileCard";
import { mapToCardProps } from "@/lib/search/mapToCardProps";
import type { SearchFailure } from "@/lib/search/searchParams";
import { SearchResult, ViewMode } from "@/types/search-details";

interface SearchResultsViewProps {
  viewMode: ViewMode;
  results: SearchResult[];
  failure?: SearchFailure | null;
  onRetry?: () => void;
}

const FAILURE_MESSAGES: Record<SearchFailure, string> = {
  rate_limited:
    "You're searching too quickly. Please wait a moment and try again.",
  unauthorized: "Your session has expired. Sign in again to continue.",
  depth_limit: "Refine your filters to see more results.",
  bad_request:
    "We couldn't run that search. Try changing or clearing your filters.",
  generic: "Search failed. Try again.",
};

// A last-ditch uniqueness suffix in case unitid+cip+title somehow collides
// (e.g. two rows for the same program that differ only in a field not in
// this key), never the sole identity — see M5 in the frontend fix guide.
const resultKey = (result: SearchResult, i: number) =>
  `${result.unitid}-${result.cip_code ?? ""}-${result.credential_title ?? ""}-${i}`;

export default function SearchResultsView({
  viewMode,
  results,
  failure,
  onRetry,
}: SearchResultsViewProps) {
  if (failure) {
    // The page-depth cap is a limit, not a fault: nothing to retry.
    const canRetry = failure !== "depth_limit" && failure !== "bad_request";
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-gray-500">{FAILURE_MESSAGES[failure]}</p>
        {onRetry && canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-bold text-blue-600 hover:underline cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        No results found.
      </p>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {results.map((result, i) => (
          <TileCard key={resultKey(result, i)} {...mapToCardProps(result)} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {results.map((result, i) => (
        <ResultCard key={resultKey(result, i)} {...mapToCardProps(result)} />
      ))}
    </div>
  );
}
