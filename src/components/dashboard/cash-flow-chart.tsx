"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/format";

// Custom tooltip for premium look
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-xl px-3 py-2.5 shadow-md text-xs">
        <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
        {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
          <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

interface CashFlowChartProps {
  data: { label: string, income: number, expenses: number }[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(0.75 0.15 140)" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="oklch(0.75 0.15 140)" stopOpacity={0.01}/>
          </linearGradient>
          <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(0.60 0.18 25)" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="oklch(0.60 0.18 25)" stopOpacity={0.01}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="oklch(0.7 0.01 240)" />
        <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.7 0.01 240)" />
        <Tooltip content={<CustomTooltip />} />
        <Area
          name="Income"
          type="monotone"
          dataKey="income"
          stroke="oklch(0.65 0.15 140)"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorInc)"
        />
        <Area
          name="Expenses"
          type="monotone"
          dataKey="expenses"
          stroke="oklch(0.60 0.18 25)"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorExp)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
