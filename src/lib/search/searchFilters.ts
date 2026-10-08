import { SearchResult } from "@/types/search-details";

export const getCollegeType = (result: SearchResult) =>
  result.college_type || result.school_type || "";

export const matchesCollegeType = (
  result: SearchResult,
  selectedType: string,
) => {
  const collegeType = getCollegeType(result).toLowerCase();

  if (selectedType === "public") {
    return collegeType.includes("public");
  }

  if (selectedType === "private") {
    return collegeType.includes("private");
  }

  return true;
};

interface SearchFilterArgs {
  schoolType: string | null;
  categoryKeywords: string[] | null;
}

const textMatchesKeyword = (text: string | null | undefined, kw: string) =>
  Boolean(text && text.toLowerCase().includes(kw.toLowerCase()));

// Client-side narrowing of the broad result set returned by the API for
// filters the API can't apply itself (school type and category keyword
// matching). Credential and state selections are applied by the API.
export const filterSearchResults = (
  data: SearchResult[],
  { schoolType, categoryKeywords }: SearchFilterArgs,
): SearchResult[] => {
  let filteredData = data;

  if (schoolType) {
    filteredData = filteredData.filter((item) =>
      matchesCollegeType(item, schoolType),
    );
  }

  if (categoryKeywords && categoryKeywords.length > 0) {
    filteredData = filteredData.filter((item) =>
      categoryKeywords.some(
        (kw) =>
          textMatchesKeyword(item.program_title, kw) ||
          textMatchesKeyword(item.credential_title, kw),
      ),
    );
  }

  return filteredData;
};
