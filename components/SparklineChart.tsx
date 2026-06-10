"use client";

import { Area, AreaChart } from "recharts";

interface SparklineChartProps {
  data: { i: number; v: number }[];
  fill: string;
  gradId: string;
}

export default function SparklineChart({ data, fill, gradId }: SparklineChartProps) {
  return (
    <AreaChart width={80} height={40} data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.4} />
          <stop offset="100%" stopColor={fill} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey="v"
        stroke={fill}
        strokeWidth={1.8}
        fill={`url(#${gradId})`}
        isAnimationActive={false}
      />
    </AreaChart>
  );
}
