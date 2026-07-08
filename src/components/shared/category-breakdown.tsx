"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/format";

export interface CategoryDatum {
  category: string;
  amount: number;
  color: string;
}

/**
 * Reusable category doughnut + ranked legend.
 * Slices and legend rows are proportional to each category's share of the total.
 * Data is expected pre-sorted (largest first); we sort defensively anyway.
 */
export function CategoryBreakdown({
  data,
  size = 176,
}: {
  data: CategoryDatum[];
  size?: number;
}) {
  const sorted = [...data].filter((d) => d.amount > 0).sort((a, b) => b.amount - a.amount);
  const total = sorted.reduce((sum, d) => sum + d.amount, 0);

  if (total <= 0) {
    return (
      <div className="flex items-center justify-center py-10 text-center text-xs text-muted-foreground italic">
        No expenses recorded for this period.
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      {/* Doughnut with centred total */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sorted}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.34}
              outerRadius={size * 0.48}
              paddingAngle={2}
              dataKey="amount"
              nameKey="category"
              strokeWidth={0}
            >
              {sorted.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const v = Number(value);
                const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                return [`${formatCurrency(v)} (${pct}%)`, name];
              }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                fontSize: "12px",
                boxShadow: "0 8px 24px oklch(0 0 0 / 0.12)",
              }}
              labelStyle={{ color: "var(--popover-foreground)", fontWeight: 600 }}
              itemStyle={{ color: "var(--popover-foreground)" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total
          </span>
          <span className="text-base font-bold text-foreground">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Ranked legend with amount + share */}
      <div className="flex-1 w-full space-y-2">
        {sorted.map((d) => {
          const pct = Math.round((d.amount / total) * 100);
          return (
            <div key={d.category} className="flex items-center gap-2.5 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="font-medium text-foreground truncate flex-1">
                {d.category}
              </span>
              <span className="font-mono text-muted-foreground shrink-0">
                {formatCurrency(d.amount)}
              </span>
              <span className="font-semibold text-foreground w-9 text-right shrink-0">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
