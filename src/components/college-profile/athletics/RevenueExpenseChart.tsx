"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AthleticsData } from "@/types/university/AthleticsData";
import DisclaimerTooltip from "@/components/common/DisclaimerTooltip";
import { DATA_SOURCE_DISCLAIMERS } from "@/constants/dataSourceDisclaimers";
import { NOT_PUBLISHED } from "@/lib/notPublished";

interface RevenueExpenseChartProps {
  data: AthleticsData;
}

const REVENUE_COLOR = "#0ACC4E";
const EXPENSE_COLOR = "#F59E0B";

const toMillions = (val: number | null | undefined): number | null =>
  val == null ? null : Math.round((val / 1_000_000) * 10) / 10;

export default function RevenueExpenseChart({
  data,
}: RevenueExpenseChartProps) {
  const revenue = toMillions(data.summary?.athleticRevenue);
  const expense = toMillions(data.summary?.athleticExpense);

  // Only reported figures become bars — a missing one is no bar, not "$0".
  const chartData = [
    { label: "Revenue", value: revenue, color: REVENUE_COLOR },
    { label: "Expense", value: expense, color: EXPENSE_COLOR },
  ].filter((d): d is { label: string; value: number; color: string } =>
    d.value !== null,
  );
  const fmtM = (v: number | null) => (v === null ? NOT_PUBLISHED : `$${v} million`);

  const ariaLabel = `Bar chart of reported athletics revenue (${fmtM(revenue)}) and expense (${fmtM(expense)}) for ${data.surveyYear ?? "the most recent survey year"}.`;

  return (
    <div>
      <h2 className="flex items-center gap-1.5 text-2xl font-bold text-black font-poppins mb-1">
        Revenue vs expense
        <DisclaimerTooltip text={DATA_SOURCE_DISCLAIMERS.eada} />
      </h2>
      <p className="text-xs text-slate-500 font-poppins mb-4">
        Reported athletics revenue and expense for{" "}
        {data.surveyYear ?? "the most recent survey year"}. Athletic departments
        are typically subsidized to balance revenue and expense — this is not a
        measure of financial health.
      </p>

      <div
        className="bg-white rounded-2xl border border-[#E2E8F0] p-4"
        role="img"
        aria-label={ariaLabel}
      >
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `$${v}M`}
                tick={{ fontSize: 12, fontFamily: "var(--font-poppins)" }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={70}
                tick={{ fontSize: 13, fontFamily: "var(--font-poppins)" }}
              />
              <Tooltip formatter={(v) => `$${v}M`} />
              <Bar
                dataKey="value"
                name="Reported"
                radius={[0, 6, 6, 0]}
                barSize={22}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ background: REVENUE_COLOR }}
            />
            <span className="text-xs text-slate-600 font-poppins">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ background: EXPENSE_COLOR }}
            />
            <span className="text-xs text-slate-600 font-poppins">Expense</span>
          </div>
        </div>
      </div>
    </div>
  );
}
