'use client';

import { type ReactNode } from 'react';

interface Metric {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
}

interface MetricsGridProps {
  metrics: Metric[];
  cols?: 2 | 3 | 4;
}

const colorMap = {
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  green:  'bg-green-50 text-green-700 border-green-200',
  red:    'bg-red-50 text-red-700 border-red-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  gray:   'bg-gray-50 text-gray-700 border-gray-200',
};

export default function MetricsGrid({ metrics, cols = 4 }: MetricsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  }[cols];

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {metrics.map((m, i) => (
        <div
          key={i}
          className={`rounded-lg border p-4 ${colorMap[m.color ?? 'gray']}`}
        >
          {m.icon && <div className="mb-2">{m.icon}</div>}
          <p className="text-sm font-medium opacity-80">{m.label}</p>
          <p className="mt-1 text-2xl font-bold">{m.value}</p>
          {m.subtitle && <p className="mt-1 text-xs opacity-70">{m.subtitle}</p>}
        </div>
      ))}
    </div>
  );
}
