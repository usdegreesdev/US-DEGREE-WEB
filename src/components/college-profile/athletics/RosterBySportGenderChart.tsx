"use client";

import { NOT_PUBLISHED } from "@/lib/notPublished";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AthleticsRosterRow } from "@/types/university/AthleticsData";
import { MEN_COLOR, WOMEN_COLOR } from "./athleticsColors";
import DisclaimerTooltip from "@/components/common/DisclaimerTooltip";
import { DATA_SOURCE_DISCLAIMERS } from "@/constants/dataSourceDisclaimers";

interface RosterBySportGenderChartProps {
  roster: AthleticsRosterRow[];
}

export default function RosterBySportGenderChart({
  roster,
}: RosterBySportGenderChartProps) {
  const [showTable, setShowTable] = useState(false);

  // A row total exists only when both counts are reported; unknown totals
  // sort last rather than being treated as 0.
  const totalOf = (r: { men: number | null; women: number | null }) =>
    r.men !== null && r.women !== null ? r.men + r.women : null;
  const sorted = [...roster].sort((a, b) => {
    const ta = totalOf(a);
    const tb = totalOf(b);
    if (ta === null || tb === null) return ta === null ? (tb === null ? 0 : 1) : -1;
    return tb - ta;
  });

  const chartHeight = Math.max(sorted.length * 36, 160);

  const ariaLabel = `Stacked bar chart of roster size by sport and gender. ${sorted
    .map(
      (r) =>
        `${r.sport}: ${r.men ?? NOT_PUBLISHED} men, ${r.women ?? NOT_PUBLISHED} women`,
    )
    .join("; ")}.`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="flex items-center gap-1.5 text-2xl font-bold text-black font-poppins">
          Roster size by sport and gender
          <DisclaimerTooltip text={DATA_SOURCE_DISCLAIMERS.eada} />
        </h2>
        <button
          type="button"
          onClick={() => setShowTable((s) => !s)}
          className="text-xs font-bold text-[#2563EB] font-poppins underline underline-offset-2"
        >
          {showTable ? "View as chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-x-auto">
          <table className="w-full text-sm font-poppins">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                <th className="text-left px-4 py-3 font-bold text-slate-600">
                  Sport
                </th>
                <th className="text-right px-4 py-3 font-bold text-slate-600">
                  Men
                </th>
                <th className="text-right px-4 py-3 font-bold text-slate-600">
                  Women
                </th>
                <th className="text-right px-4 py-3 font-bold text-slate-600">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={row.sport}
                  className={
                    i < sorted.length - 1 ? "border-b border-[#E2E8F0]" : ""
                  }
                >
                  <td className="px-4 py-2.5 text-black">{row.sport}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">
                    {row.men ?? NOT_PUBLISHED}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700">
                    {row.women ?? NOT_PUBLISHED}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-black">
                    {totalOf(row) ?? NOT_PUBLISHED}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="bg-white rounded-2xl border border-[#E2E8F0] p-4"
          role="img"
          aria-label={ariaLabel}
        >
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sorted}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fontFamily: "var(--font-poppins)" }}
                />
                <YAxis
                  type="category"
                  dataKey="sport"
                  width={160}
                  tick={{ fontSize: 12, fontFamily: "var(--font-poppins)" }}
                />
                <Tooltip />
                <Bar
                  dataKey="men"
                  name="Men"
                  stackId="roster"
                  fill={MEN_COLOR}
                  barSize={18}
                />
                <Bar
                  dataKey="women"
                  name="Women"
                  stackId="roster"
                  fill={WOMEN_COLOR}
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ background: MEN_COLOR }}
              />
              <span className="text-xs text-slate-600 font-poppins">Men</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ background: WOMEN_COLOR }}
              />
              <span className="text-xs text-slate-600 font-poppins">Women</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
