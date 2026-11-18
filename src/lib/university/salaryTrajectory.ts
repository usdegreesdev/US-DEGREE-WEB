/**
 * Salary trajectory geometry from REAL earnings points only.
 *
 * Plots the published year-1, year-5 and year-10 earnings at fixed x slots.
 * A missing point is a gap: it is not interpolated (no year5 ÷ 1.3, no
 * year10 ÷ 1.6), the line does not cross it, and nothing is extrapolated
 * past year 10 (no year 15 / year 20). The caller names the missing points.
 */

export interface TrajectoryInput {
  year1: number | null;
  year5: number | null;
  year10: number | null;
}

export interface TrajectoryPoint {
  label: string;
  value: number | null;
  x: number;
  /** Final y; null when the value is missing. */
  y: number | null;
}

export interface TrajectoryGeometry {
  points: TrajectoryPoint[];
  /** One SVG path per run of consecutive real points (2+ points). */
  linePaths: string[];
  /** Closed fill paths under each run. */
  fillPaths: string[];
  /** Labels of points that are not published. */
  missing: string[];
  /** Y-axis gridline values (UI bounds derived from the real points). */
  gridValues: number[];
  hasAny: boolean;
}

export interface ChartBox {
  width: number;
  height: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
}

export const TRAJECTORY_BOX: ChartBox = {
  width: 600,
  height: 220,
  paddingLeft: 60,
  paddingRight: 40,
  paddingTop: 20,
  paddingBottom: 30,
};

const finite = (v: number | null) =>
  v !== null && Number.isFinite(v) ? v : null;

export function buildTrajectory(
  input: TrajectoryInput,
  box: ChartBox = TRAJECTORY_BOX,
  animProgress = 1,
): TrajectoryGeometry {
  const raw = [
    { label: "YEAR 1", value: finite(input.year1) },
    { label: "YEAR 5", value: finite(input.year5) },
    { label: "YEAR 10", value: finite(input.year10) },
  ];
  const real = raw.map((p) => p.value).filter((v): v is number => v !== null);
  const hasAny = real.length > 0;

  // Axis bounds: a UI choice around the real data, never a data value.
  const lo = hasAny ? Math.min(...real) * 0.8 : 0;
  const hi = hasAny ? Math.max(...real) * 1.1 : 1;
  const span = hi - lo === 0 ? 1 : hi - lo;

  const plotH = box.height - box.paddingTop - box.paddingBottom;
  const plotW = box.width - box.paddingLeft - box.paddingRight;
  const baseline = box.height - box.paddingBottom;
  const yFor = (v: number) => baseline - ((v - lo) * plotH) / span;

  const points: TrajectoryPoint[] = raw.map((p, i) => {
    const x = box.paddingLeft + (i * plotW) / (raw.length - 1);
    if (p.value === null) return { ...p, x, y: null };
    const target = yFor(p.value);
    return { ...p, x, y: baseline + (target - baseline) * animProgress };
  });

  // Runs of consecutive real points; a gap ends a run.
  const runs: TrajectoryPoint[][] = [];
  let run: TrajectoryPoint[] = [];
  for (const p of points) {
    if (p.y === null) {
      if (run.length) runs.push(run);
      run = [];
    } else {
      run.push(p);
    }
  }
  if (run.length) runs.push(run);

  const linePaths: string[] = [];
  const fillPaths: string[] = [];
  for (const r of runs) {
    if (r.length < 2) continue;
    let d = `M ${r[0].x} ${r[0].y}`;
    for (let i = 0; i < r.length - 1; i++) {
      const a = r[i];
      const b = r[i + 1];
      const c1 = a.x + (b.x - a.x) / 3;
      const c2 = a.x + (2 * (b.x - a.x)) / 3;
      d += ` C ${c1} ${a.y}, ${c2} ${b.y}, ${b.x} ${b.y}`;
    }
    linePaths.push(d);
    fillPaths.push(
      `${d} L ${r[r.length - 1].x} ${baseline} L ${r[0].x} ${baseline} Z`,
    );
  }

  return {
    points,
    linePaths,
    fillPaths,
    missing: raw.filter((p) => p.value === null).map((p) => p.label),
    gridValues: hasAny ? [lo, (lo + hi) / 2, hi] : [],
    hasAny,
  };
}

/** "Year 5 earnings are not published, so that point is not plotted. …" */
export function trajectoryGapNote(missing: readonly string[]): string | null {
  if (missing.length === 0) return null;
  const names = missing.map((m) => m.charAt(0) + m.slice(1).toLowerCase());
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `${list} earnings are not published, so ${
    names.length === 1 ? "that point is" : "those points are"
  } not plotted. Only reported figures are shown.`;
}
