import type { ReadonlyURLSearchParams } from "next/navigation";

import { CATEGORY_KEYWORDS } from "@/constants/searchCategories";
import { pickSearchParams } from "@/lib/search/searchParams";

// Choices offered by the "results per page" control. The user's pick is
// stored in the URL (`per_page`) so it survives pagination/filter changes
// and back/forward navigation, overriding the list/grid view default.
export const PAGE_SIZE_OPTIONS = [10, 20, 25, 50] as const;

interface SearchRequest {
  requestParams: URLSearchParams;
}

// Translate the page's URL search params into the query sent to the API.
// Only params the API accepts are copied (see searchParams.ts) — UI-only
// params such as school_type, category, per_page and view never leave the
// browser (school_type and category are filtered client-side). Multi-value
// credential_title / state selections go to the API as comma-separated lists
// (max 10 each), so the server narrows and paginates them.
export const buildSearchRequest = (
  searchParams: ReadonlyURLSearchParams,
  category: string,
  page?: number,
  limit?: number,
): SearchRequest => {
  const requestParams = pickSearchParams(
    new URLSearchParams(searchParams.toString()),
  );

  if (page != null) {
    requestParams.set("page", String(page));
  }
  if (limit != null) {
    requestParams.set("limit", String(limit));
  }

  // When a category is selected but no explicit search title exists, send the
  // primary category keyword as the title so the API returns relevant programs
  // instead of an empty / unfiltered result set.
  if (category && !requestParams.get("title")) {
    const categoryKws = CATEGORY_KEYWORDS[category];
    if (categoryKws && categoryKws.length > 0) {
      requestParams.set("title", categoryKws[0]);
    }
  }

  return { requestParams };
};
