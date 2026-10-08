import { describe, expect, it } from "vitest";
import { buildCollegeRow } from "./buildCollegeRow";
import type { SelectedCompareCollege } from "@/lib/auth/api";

describe("buildCollegeRow", () => {
  it("does not throw on a partial API row", () => {
    const base = { name: "Partial U" } as unknown as SelectedCompareCollege;
    const row = buildCollegeRow("1", {
      baseByEntryId: new Map([["1", base]]),
      storedDetails: [],
      entryProgramsMap: {},
      allUniversities: new Map(),
      cacheUniversity: () => null,
    });
    expect(row.name).toBe("Partial U");
    expect(row.tuitionOutOfState).toBeNull();
    expect(row.graduationRate).toBeNull();
    expect(row.studentPopulation).toBeNull();
  });
});
