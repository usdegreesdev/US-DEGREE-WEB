import { describe, expect, it } from "vitest";
import type { College } from "@/types/university/ComparisonTable";
import { programFamily, programsDiffer } from "./programFamilies";

const c = (cip: string | undefined, programCipCode?: string): College =>
  ({ id: cip ?? "x", cipCode: cip, programCipCode }) as College;

describe("programFamily", () => {
  it("normalizes dotted, undotted and short codes", () => {
    expect(programFamily(c("51.39"))).toBe("51");
    expect(programFamily(c("5139"))).toBe("51");
    expect(programFamily(c("51.38"))).toBe("51");
    expect(programFamily(c("301"))).toBe("03");
    expect(programFamily(c("3.01"))).toBe("03");
    expect(programFamily(c("0301"))).toBe("03");
  });

  it("prefers the backend CIP and ignores missing programs", () => {
    expect(programFamily(c("5201", "51.39"))).toBe("51");
    expect(programFamily(c("default"))).toBeNull();
    expect(programFamily(c(undefined))).toBeNull();
  });
});

describe("programsDiffer", () => {
  it("is true for the five-college mixed-family example", () => {
    expect(
      programsDiffer([c("5139"), c("5009"), c("5202"), c("52.03"), c("0301")]),
    ).toBe(true);
  });

  it("is false for same family, a single college, or no CIP data", () => {
    expect(programsDiffer([c("5202"), c("52.03")])).toBe(false);
    expect(programsDiffer([c("5139")])).toBe(false);
    expect(programsDiffer([c("5139"), c("default")])).toBe(false);
    expect(programsDiffer([])).toBe(false);
  });
});
