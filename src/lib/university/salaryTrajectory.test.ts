import { describe, expect, it } from "vitest";
import { buildTrajectory, trajectoryGapNote } from "./salaryTrajectory";

// Blast radius (earnings_against_courses_merged, 2026-11-18): years 15 and 20
// were extrapolated (×1.25, ×1.5) for all 14,617 programs with any earnings;
// missing year-1/5/10 points were interpolated (÷1.3, ÷1.6, ×1.25) for 1,221
// programs across 283 schools. The 40000 placeholder never rendered (the
// chart is hidden for the 5,054 programs with no earnings) but is gone too.

const plotted = (g: ReturnType<typeof buildTrajectory>) =>
  g.points.filter((p) => p.y !== null).map((p) => p.label);

describe("salary trajectory plots only real points", () => {
  it("three real points → three points, one line, no year 15/20", () => {
    const g = buildTrajectory({ year1: 40000, year5: 52000, year10: 65000 });
    expect(g.points.map((p) => p.label)).toEqual(["YEAR 1", "YEAR 5", "YEAR 10"]);
    expect(plotted(g)).toEqual(["YEAR 1", "YEAR 5", "YEAR 10"]);
    expect(g.linePaths).toHaveLength(1);
    expect(g.missing).toEqual([]);
    expect(trajectoryGapNote(g.missing)).toBeNull();
  });

  it("year 1 missing (part of the 1,221) → not interpolated as year5 ÷ 1.3", () => {
    const g = buildTrajectory({ year1: null, year5: 52000, year10: 65000 });
    expect(g.points[0].value).toBeNull();
    expect(g.points[0].y).toBeNull();
    expect(plotted(g)).toEqual(["YEAR 5", "YEAR 10"]);
    expect(g.missing).toEqual(["YEAR 1"]);
    expect(trajectoryGapNote(g.missing)).toBe(
      "Year 1 earnings are not published, so that point is not plotted. Only reported figures are shown.",
    );
  });

  it("middle point missing → a gap: no line crosses it", () => {
    const g = buildTrajectory({ year1: 40000, year5: null, year10: 65000 });
    expect(plotted(g)).toEqual(["YEAR 1", "YEAR 10"]);
    // Two isolated points, neither run has 2+ points → no line at all.
    expect(g.linePaths).toEqual([]);
    expect(g.fillPaths).toEqual([]);
  });

  it("single real point → one dot, no curve, both others named", () => {
    const g = buildTrajectory({ year1: null, year5: null, year10: 65000 });
    expect(plotted(g)).toEqual(["YEAR 10"]);
    expect(g.linePaths).toEqual([]);
    expect(trajectoryGapNote(g.missing)).toBe(
      "Year 1 and Year 5 earnings are not published, so those points are not plotted. Only reported figures are shown.",
    );
  });

  it("no real points → nothing to plot (caller shows its empty state), no 40000", () => {
    const g = buildTrajectory({ year1: null, year5: null, year10: null });
    expect(g.hasAny).toBe(false);
    expect(plotted(g)).toEqual([]);
    expect(g.gridValues).toEqual([]);
  });

  it("axis bounds come from the real points only", () => {
    const g = buildTrajectory({ year1: 50000, year5: null, year10: 100000 });
    expect(g.gridValues[0]).toBe(40000); // 50000 × 0.8
    expect(g.gridValues[2]).toBeCloseTo(110000); // 100000 × 1.1, not year-20
  });
});
