"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatArs } from "@/lib/format";

const chartConfig = {
  monto: {
    label: "Ventas",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function WeekChart({
  dias,
}: {
  dias: { label: string; monto: number }[];
}) {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={dias} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) =>
            typeof v === "number" && v >= 1000
              ? `${Math.round(v / 1000)}k`
              : String(v)
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatArs(Number(value ?? 0))}
            />
          }
        />
        <Bar
          dataKey="monto"
          fill="var(--color-monto)"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ChartContainer>
  );
}
