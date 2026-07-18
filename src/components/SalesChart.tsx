"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { getSalesDataForChart } from "@/lib/data"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useEffect, useState } from "react";

type ChartData = {
    month: string;
    sales: number;
}

const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `\$${value / 1000000}M`;
    }
    if (value >= 1000) {
      return `\$${value / 1000}k`;
    }
    return `\$${value}`;
};
  

export function SalesChart() {
  const [data, setData] = useState<ChartData[]>([]);

  useEffect(() => {
    getSalesDataForChart().then(setData);
  }, [])

  return (
    <ChartContainer config={{
        sales: {
          label: "Ventas",
          color: "hsl(var(--primary))",
        },
      }} className="min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis
            dataKey="month"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
          />
          <Tooltip cursor={{fill: 'hsl(var(--muted))'}} content={<ChartTooltipContent formatter={(value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value as number)} />} />
          <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
