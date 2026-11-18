import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  percentagePointsDiff,
  relativePercentDiff,
} from "./shared/metrics";
import {
  formatCurrency,
  formatCurrencyAbbreviated,
  formatNumber,
} from "@/components/college-profile/athletics/athleticsFormat";
import RosterBySportGenderChart from "@/components/college-profile/athletics/RosterBySportGenderChart";

// Item 7: an average over nothing is not 0, and a missing figure is not $0.

describe("compare above/below-average cue", () => {
  it("no average → no cue (null), never 0 / 'Average'", () => {
    expect(relativePercentDiff(30000, null)).toBeNull();
    expect(percentagePointsDiff(0.6, null)).toBeNull();
  });

  it("a 0 average has no ratio → no cue, not 0", () => {
    expect(relativePercentDiff(30000, 0)).toBeNull();
  });

  it("real averages still compare", () => {
    expect(relativePercentDiff(30000, 40000)).toBe(-25);
    expect(percentagePointsDiff(0.7, 0.6)).toBeCloseTo(10);
  });
});

describe("athletics formatting", () => {
  it("non-finite → Not published, never $0 / 0", () => {
    expect(formatCurrency(NaN)).toBe("Not published");
    expect(formatCurrencyAbbreviated(Infinity)).toBe("Not published");
    expect(formatNumber(NaN)).toBe("Not published");
    expect(formatCurrency(null)).toBe("Not published");
  });

  it("a real 0 is $0 / 0", () => {
    expect(formatCurrency(0)).toBe("$0");
    expect(formatNumber(0)).toBe("0");
  });

  it("roster: an unreported count shows Not published and no total", () => {
    render(
      <RosterBySportGenderChart
        roster={[
          { sport: "Soccer", men: null, women: 22 },
          { sport: "Tennis", men: 9, women: 10 },
        ]}
      />,
    );
    const label = screen.getByRole("img").getAttribute("aria-label") ?? "";
    expect(label).toContain("Soccer: Not published men, 22 women");
    expect(label).toContain("Tennis: 9 men, 10 women");
  });
});
