'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  label: string;
  adherence_rate: number;
}

interface AdherenceLineChartProps {
  data: DataPoint[];
  target?: number;
}

export default function AdherenceLineChart({ data, target = 90 }: AdherenceLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
        <Tooltip
          formatter={(v: number) => [`${v}%`, 'Adesão']}
          labelStyle={{ fontSize: 12 }}
        />
        <ReferenceLine y={target} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `Meta ${target}%`, position: 'right', fontSize: 10 }} />
        <Line
          type="monotone"
          dataKey="adherence_rate"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4, fill: '#3b82f6' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
