'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  label: string;
  value: number;
}

interface OccupancyAreaChartProps {
  data: DataPoint[];
  capacity?: number;
}

export default function OccupancyAreaChart({ data, capacity }: OccupancyAreaChartProps) {
  const maxY = capacity ? capacity + 2 : undefined;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="occGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, maxY ?? 'auto']} tick={{ fontSize: 11 }} />
        <Tooltip labelStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="value"
          name="Residentes"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#occGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
