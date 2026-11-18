import React from "react";
import {
  TRAJECTORY_BOX,
  buildTrajectory,
  trajectoryGapNote,
} from "@/lib/university/salaryTrajectory";

interface SalaryTrajectoryChartProps {
  year1: number | null;
  year5: number | null;
  year10: number | null;
  animProgress: number;
  gradientId: string;
  clipId: string;
  formatCurrency: (v: number) => string;
  /** Smaller axis labels for the compare modal. */
  compact?: boolean;
}

/**
 * Plots only the published year-1/5/10 earnings. Callers render their own
 * empty state when no point is published; this renders the chart plus a note
 * naming any missing point.
 */
export default function SalaryTrajectoryChart({
  year1,
  year5,
  year10,
  animProgress,
  gradientId,
  clipId,
  formatCurrency,
  compact = false,
}: SalaryTrajectoryChartProps) {
  const box = TRAJECTORY_BOX;
  const g = buildTrajectory({ year1, year5, year10 }, box, animProgress);
  const final = buildTrajectory({ year1, year5, year10 }, box, 1);
  const note = trajectoryGapNote(g.missing);

  return (
    <>
      <div className="w-full overflow-x-auto">
        <svg
          data-testid="salary-trajectory"
          viewBox={`0 0 ${box.width} ${box.height}`}
          className="w-full min-w-[500px] h-auto overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
            <clipPath id={clipId}>
              <rect
                x="0"
                y="0"
                width={box.width * animProgress}
                height={box.height}
              />
            </clipPath>
          </defs>

          {/* Y axis gridlines, from the final (un-animated) geometry */}
          {final.gridValues.map((v, i) => {
            const lo = final.gridValues[0];
            const hi = final.gridValues[final.gridValues.length - 1];
            const span = hi - lo === 0 ? 1 : hi - lo;
            const y =
              box.height -
              box.paddingBottom -
              ((v - lo) * (box.height - box.paddingTop - box.paddingBottom)) /
                span;
            return (
              <g key={i}>
                <line
                  x1={box.paddingLeft}
                  y1={y}
                  x2={box.width - box.paddingRight}
                  y2={y}
                  stroke="#F3F4F6"
                  strokeWidth="1.5"
                />
                <text
                  x={box.paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className={`${compact ? "text-[9px]" : "text-[10px]"} font-black text-gray-400`}
                >
                  {formatCurrency(v)}
                </text>
              </g>
            );
          })}

          {g.fillPaths.map((d, i) => (
            <path
              key={`f${i}`}
              d={d}
              fill={`url(#${gradientId})`}
              clipPath={`url(#${clipId})`}
            />
          ))}
          {g.linePaths.map((d, i) => (
            <path
              key={`l${i}`}
              data-testid="trajectory-line"
              d={d}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3.5"
              strokeLinecap="round"
              clipPath={`url(#${clipId})`}
            />
          ))}

          {g.points.map((p) =>
            p.y === null ? null : (
              <circle
                key={p.label}
                data-testid="trajectory-point"
                cx={p.x}
                cy={p.y}
                r={box.width * animProgress >= p.x ? 5 : 0}
                fill="#FFFFFF"
                stroke="#3B82F6"
                strokeWidth="3.5"
                style={{
                  transition: "r 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              />
            ),
          )}

          {g.points.map((p) => (
            <text
              key={`x${p.label}`}
              x={p.x}
              y={box.height - box.paddingBottom + 18}
              textAnchor="middle"
              className={`text-[9px] font-black uppercase tracking-wider ${
                p.value === null ? "fill-gray-300" : "fill-gray-400"
              }`}
            >
              {p.label}
            </text>
          ))}
        </svg>
      </div>
      {note && (
        <p
          data-testid="trajectory-gap-note"
          className="text-[11px] text-gray-500 text-center mt-3"
        >
          {note}
        </p>
      )}
    </>
  );
}
