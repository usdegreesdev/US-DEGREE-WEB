"use client";

import React, { useEffect, useRef, useState } from "react";
import { StatsGridProps } from "@/types/university/StatsGrid";

/** Parse a numeric value from a display string like "17,249", "98%", "5:1", "20+" */
const extractNumber = (val: string): number | null => {
  // Handle ratio strings like "5:1" — extract the first number
  if (val.includes(":")) {
    const num = parseInt(val);
    return isNaN(num) ? null : num;
  }
  const cleaned = val.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
};

/** Format an animated number back into its display form based on the label */
const formatAnimValue = (
  label: string,
  current: number,
  final: string,
): string => {
  if (label === "TOTAL STUDENTS" || label === "FAFSA APPLICATION") {
    return Math.round(current).toLocaleString();
  }
  if (label === "FACULTY RATIO") {
    // "5:1" style — animate the left number
    return `${Math.round(current)}:1`;
  }
  if (label === "RETENTION RATE" || label === "COMPLETION") {
    return `${Math.round(current)}%`;
  }
  if (label === "PROGRAMS") {
    return `${Math.round(current)}+`;
  }
  return final;
};

export default function StatsGrid({
  totalStudents,
  facultyRatio,
  retentionRate,
  programs,
  fafsaApplications,
  completionRate,
}: StatsGridProps) {
  const stats = [
    {
      label: "TOTAL STUDENTS",
      value: totalStudents != null ? totalStudents.toLocaleString() : "N/A",
      accentColor: "#2563EB",
      accentBg: "#EEF2FF",
      accentBorder: "#C7D2FE",
      valueColor: "#1E3A8A",
    },
    {
      label: "FACULTY RATIO",
      value: facultyRatio ?? "N/A",
      accentColor: "#16A34A",
      accentBg: "#F0FDF4",
      accentBorder: "#BBF7D0",
      valueColor: "#14532D",
    },
    {
      label: "RETENTION RATE",
      value: retentionRate ?? "N/A",
      accentColor: "#D97706",
      accentBg: "#FFFBEB",
      accentBorder: "#FDE68A",
      valueColor: "#78350F",
    },
    {
      label: "PROGRAMS",
      value: programs != null ? `${programs}+` : "N/A",
      accentColor: "#0891B2",
      accentBg: "#ECFEFF",
      accentBorder: "#A5F3FC",
      valueColor: "#164E63",
    },
    {
      label: "FAFSA APPLICATION",
      value:
        fafsaApplications != null ? fafsaApplications.toLocaleString() : "N/A",
      accentColor: "#E11D48",
      accentBg: "#FFF1F2",
      accentBorder: "#FECDD3",
      valueColor: "#881337",
    },
    {
      label: "COMPLETION",
      value: completionRate ?? "N/A",
      accentColor: "#7C3AED",
      accentBg: "#F5F3FF",
      accentBorder: "#DDD6FE",
      valueColor: "#4C1D95",
    },
  ];

  // ── Count-up animation state ──
  const gridRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [animValues, setAnimValues] = useState<string[]>(stats.map(() => "0"));

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          const targets = stats.map((s) => extractNumber(s.value));
          const duration = 1200;
          const steps = 60;
          const stepTime = duration / steps;
          let step = 0;

          const timer = setInterval(() => {
            step++;
            const progress = Math.min(step / steps, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            setAnimValues(
              stats.map((s, i) => {
                const target = targets[i];
                if (target === null || s.value === "N/A") return s.value;
                return formatAnimValue(s.label, eased * target, s.value);
              }),
            );

            if (step >= steps) {
              clearInterval(timer);
              // Snap to final exact values
              setAnimValues(stats.map((s) => s.value));
            }
          }, stepTime);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnimated]);

  return (
    <div ref={gridRef} className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 py-2">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="flex flex-col justify-between min-h-[90px] sm:min-h-[100px] p-3.5 sm:p-5 border rounded-2xl"
          style={{
            backgroundColor: stat.accentBg,
            borderColor: stat.accentBorder,
          }}
        >
          {/* Label */}
          <p
            style={{
              margin: 0,
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: stat.accentColor,
              textTransform: "uppercase",
              paddingBottom: "3px",
              display: "inline-block",
              alignSelf: "flex-start",
            }}
          >
            {stat.label}
          </p>

          {/* Animated Value */}
          <p
            className="m-0 mt-3 text-2xl sm:text-[32px] font-extrabold leading-none"
            style={{
              color: stat.valueColor,
            }}
          >
            {stat.label === "FAFSA APPLICATION" ? (
              <span style={{ paddingBottom: "2px" }}>
                {hasAnimated ? animValues[i] : "0"}
              </span>
            ) : hasAnimated ? (
              animValues[i]
            ) : (
              "0"
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
