import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { firstReal } from "./firstReal";
import { buildUniversityViewData } from "./university/buildUniversityViewData";
import type { UniversityApiBundle } from "./university/fetchUniversityData";
import ProgramsAcademicsTab from "@/components/university/ProgramsAcademicsTab";

// Item 9: a real zero is a value — never skipped by `||` or a `> 0` gate.

beforeEach(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

describe("firstReal", () => {
  it("keeps a real 0 instead of skipping it", () => {
    expect(firstReal(0, 50000)).toBe(0);
    expect(firstReal(null, undefined, "", 7)).toBe(7);
    expect(firstReal(null, NaN as unknown as number)).toBeNull();
    expect(firstReal(-30)).toBe(-30);
  });
});

describe("view data keeps real zeros", () => {
  it("0 salary, 0 ROI, 0 growth, 0 applicants, 0 faculty ratio", async () => {
    const v = await buildUniversityViewData(
      "1",
      {},
      {
        outcomesData: {
          earnings_resolved: { year_1: { value: 0 } },
          earnings: { year_1: 41000, growth_rate: 0 },
          roi: { roi_20yr: 0 },
        },
        apiData: {
          students: { fafsa_applications: 0, student_faculty_ratio: 0 },
          roi: { roi_20yr: 250000 },
        },
      } as unknown as UniversityApiBundle,
    );
    expect(v.salaryYear1).toBe(0); // not the next source's 41000
    expect(v.netRoi20Yr).toBe(0); // not the overview's 250000
    expect(v.growthRate).toBe(0); // not recomputed
    expect(v.applicants).toBe("0"); // not "N/A"
    expect(v.facultyRatio).toBe("0:1"); // not "N/A"
  });

  it("missing still renders Not published, not N/A", async () => {
    const v = await buildUniversityViewData("1", {}, {} as unknown as UniversityApiBundle);
    expect(v.applicants).toBe("Not published");
    expect(v.facultyRatio).toBe("Not published");
    expect(v.netRoi20Yr).toBeNull();
  });
});

describe("a real 0% admit rate (3 schools) is labelled, not N/A", () => {
  it("Programs tab selectivity", () => {
    render(<ProgramsAcademicsTab data={{ admissionRate: "0.0%" }} />);
    expect(screen.getByText("Highly Selective")).toBeInTheDocument();
  });
});
