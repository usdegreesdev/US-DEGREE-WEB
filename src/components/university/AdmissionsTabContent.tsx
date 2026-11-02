"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchProfile } from "@/lib/auth/api";
import { AdmissionsTabContentProps } from "@/types/university/AdmissionsTabContent";
import { buildAdmissionsGlance } from "@/lib/university/admissionsGlance";
import ScoreRangeBar from "./ScoreRangeBar";

const RING_RADIUS = 52;
const RING_STROKE = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const SECTION_HEADING_CLASS = "text-2xl font-semibold font-poppins";
const TILE_CLASS =
  "flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5";
const TILE_LABEL_CLASS = "text-sm font-medium text-slate-700 font-poppins";
const TILE_HELPER_CLASS = "text-sm text-slate-600 font-poppins";
const NOT_AVAILABLE = "Not available";

function AcceptanceRing({ pct }: { pct: number | null }) {
  const clamped = pct === null ? 0 : Math.min(100, Math.max(0, pct));
  const offset = RING_CIRCUMFERENCE * (1 - clamped / 100);
  const text = pct === null ? NOT_AVAILABLE : `${pct.toFixed(1)}%`;

  return (
    <div
      role="img"
      aria-label={
        pct === null
          ? "Acceptance rate not available"
          : `Acceptance rate ${pct.toFixed(1)} percent`
      }
      className="relative h-32 w-32 shrink-0"
    >
      <svg viewBox="0 0 128 128" className="h-full w-full" aria-hidden="true">
        <circle
          cx="64"
          cy="64"
          r={RING_RADIUS}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={RING_STROKE}
        />
        {pct !== null && (
          <circle
            cx="64"
            cy="64"
            r={RING_RADIUS}
            fill="none"
            stroke="#2054FE"
            strokeWidth={RING_STROKE}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 64 64)"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
        <span
          className={`font-lexend text-slate-900 ${
            pct === null ? "text-xs font-medium" : "text-2xl font-black"
          }`}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

export default function AdmissionsTabContent({
  admissions,
}: AdmissionsTabContentProps) {
  const glance = buildAdmissionsGlance(admissions);
  const { user } = useAuth();
  const [mySat, setMySat] = useState<number | null>(null);

  // The signed-in student's saved profile SAT (400–1600); none → no marker.
  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchProfile<Record<string, unknown>>()
      .then((data) => {
        if (!active) return;
        const n = Number(data?.sat_score ?? data?.satScore);
        setMySat(Number.isFinite(n) && n >= 400 && n <= 1600 ? n : null);
      })
      .catch(() => active && setMySat(null));
    return () => {
      active = false;
    };
  }, [user]);

  if (!glance.visible) return null;

  const { acceptancePct, avgSat, policyLabel } = glance;
  const hasAnyRange = !!(glance.overall || glance.readingWriting || glance.math);

  return (
    <div className="flex max-w-4xl flex-col gap-12 py-4">
      {/* ── Admissions at a glance ── */}
      <section className="flex flex-col gap-5">
        <h2
          className={SECTION_HEADING_CLASS}
          style={{ color: "#F7221F" }}
        >
          Admissions at a glance
        </h2>

        <div
          className={`grid grid-cols-1 gap-4 ${
            glance.showPolicyTile ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          <div className={`${TILE_CLASS} items-start`}>
            <AcceptanceRing pct={acceptancePct} />
            <h3 className={TILE_LABEL_CLASS}>Acceptance rate</h3>
            {acceptancePct !== null && (
              <p className={TILE_HELPER_CLASS}>
                About {Math.round(acceptancePct)} of every 100 applicants
              </p>
            )}
          </div>

          <div className={TILE_CLASS}>
            <h3 className={TILE_LABEL_CLASS}>Average SAT</h3>
            <p className="text-3xl font-black text-slate-900 font-lexend">
              {avgSat === null ? NOT_AVAILABLE : Math.round(avgSat)}
            </p>
            {avgSat !== null && (
              <p className={TILE_HELPER_CLASS}>Out of 1600</p>
            )}
          </div>

          {glance.showPolicyTile && (
            <div className={TILE_CLASS}>
              <h3 className={TILE_LABEL_CLASS}>SAT test policy</h3>
              <p className="text-2xl font-bold text-slate-900 font-lexend">
                {policyLabel ?? NOT_AVAILABLE}
              </p>
              <p className={TILE_HELPER_CLASS}>
                Check with the college before applying
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── SAT score ranges ── */}
      {glance.showRanges && (
        <section className="flex flex-col gap-5">
          <h2
            className={SECTION_HEADING_CLASS}
            style={{ color: "#F7221F" }}
          >
            SAT score ranges
          </h2>

          {hasAnyRange ? (
            <>
              <p className="text-base text-slate-700 font-poppins">
                The middle 50% of enrolled students with SAT scores
              </p>

              {glance.overall && (
                <div className="rounded-2xl bg-blue-50 p-5">
                  <ScoreRangeBar
                    label="Overall SAT"
                    range={glance.overall}
                    scaleMin={400}
                    scaleMax={1600}
                    tone="blue"
                    marker={user ? mySat : null}
                  />
                </div>
              )}

              {(glance.readingWriting || glance.math) && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {glance.readingWriting && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <ScoreRangeBar
                        label="Reading & Writing"
                        range={glance.readingWriting}
                        scaleMin={200}
                        scaleMax={800}
                      />
                    </div>
                  )}
                  {glance.math && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <ScoreRangeBar
                        label="Math"
                        range={glance.math}
                        scaleMin={200}
                        scaleMax={800}
                      />
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-600 font-poppins">
                Based on enrolled first-time students whose SAT scores were used
                in admission. The overall range adds the section ranges and is
                approximate. Source: IPEDS via College Scorecard.
              </p>
            </>
          ) : (
            <p className="text-base text-slate-600 font-poppins">
              SAT score ranges are not available for this college
            </p>
          )}
        </section>
      )}
    </div>
  );
}
