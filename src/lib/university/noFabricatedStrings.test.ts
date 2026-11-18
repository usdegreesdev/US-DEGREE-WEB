import { describe, expect, it } from "vitest";
import { buildUniversityViewData } from "./buildUniversityViewData";
import type { UniversityApiBundle } from "./fetchUniversityData";
import { mapToCardProps } from "@/lib/search/mapToCardProps";
import type { SearchResult } from "@/types/search-details";

// Item 6: a fabricated string is the same defect as a fabricated number.
const FABRICATED = [
  "Private Research",
  "Bachelor's Degree",
  "Full-time, On-campus",
  "distinguished institution",
  "top-tier training",
  "currently being updated",
  "4 Years",
];

describe("university view data carries no invented strings", () => {
  it("with no data, every label is null — not a default", async () => {
    const v = await buildUniversityViewData(
      "1",
      {},
      {} as unknown as UniversityApiBundle,
    );
    expect(v.type).toBeNull();
    expect(v.degree).toBeNull();
    expect(v.description).toBeNull();
    expect(v.programDescription).toBeNull();
    expect("format" in v).toBe(false);
    expect("financialAid" in v).toBe(false);
    expect("rank" in v).toBe(false);
    const json = JSON.stringify(v);
    for (const s of FABRICATED) expect(json).not.toContain(s);
    expect(json).not.toContain('"Available"');
  });

  it("real values pass through", async () => {
    const v = await buildUniversityViewData(
      "1",
      { degree: "Computer Science" },
      {
        collegeData: { school_type: "Public" },
        apiData: { school: { school_description: "A real description." } },
      } as unknown as UniversityApiBundle,
    );
    expect(v.type).toBe("Public");
    expect(v.degree).toBe("Computer Science");
    expect(v.description).toBe("A real description.");
  });

  it("disclaimerTier is the real tier or null, never a default 1", async () => {
    const withTier = (t: unknown) =>
      buildUniversityViewData(
        "1",
        {},
        {
          apiData: {
            admissions: {
              satDisclosureCategory: "E_TEST_REQUIRED_NO_RANGE",
              badgeLabel: "Required",
              disclaimerTier: t,
            },
          },
        } as unknown as UniversityApiBundle,
      );
    expect((await withTier(2)).testingRequirements?.disclaimerTier).toBe(2);
    expect((await withTier(null)).testingRequirements?.disclaimerTier).toBeNull();
    expect((await withTier(7)).testingRequirements?.disclaimerTier).toBeNull();
  });
});

describe("search cards carry no invented fields", () => {
  it("no avgGpa 'N/A', duration '4 Years' or matchScore 0", () => {
    const p = mapToCardProps({
      unitid: 1,
      school_name: "X",
    } as unknown as SearchResult);
    expect("avgGpa" in p).toBe(false);
    expect("duration" in p).toBe(false);
    expect("matchScore" in p).toBe(false);
  });
});
