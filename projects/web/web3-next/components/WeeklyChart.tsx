"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type DayData = { date: string; day: string; calories: number };

interface WeeklyChartProps {
  data: DayData[];
  target?: number;
}

export function WeeklyChart({ data, target }: WeeklyChartProps) {
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--color-fg-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-fg-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "12px",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-fg)" }}
            formatter={(value: number) => [`${value} kcal`, "Calorías"]}
          />
          {target && (
            <ReferenceLine
              y={target}
              stroke="var(--color-accent)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          )}
          <Bar
            dataKey="calories"
            fill="var(--color-accent)"
            radius={[6, 6, 0, 0]}
            fillOpacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
