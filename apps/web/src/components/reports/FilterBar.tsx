'use client';

interface FilterBarProps {
  period: string;
  onPeriodChange: (period: string) => void;
  months?: string[]; // YYYY-MM options
  showPresets?: boolean;
}

const PRESETS = [
  { label: 'Mês atual', value: 'month' },
  { label: 'Trimestre', value: 'quarter' },
  { label: 'Ano', value: 'year' },
];

function buildRecentMonths(count = 12): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    result.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value });
  }
  return result;
}

export default function FilterBar({ period, onPeriodChange, showPresets = true }: FilterBarProps) {
  const recentMonths = buildRecentMonths(12);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showPresets && PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => onPeriodChange(p.value)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            period === p.value
              ? 'bg-blue-600 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {p.label}
        </button>
      ))}
      <select
        value={/^\d{4}-\d{2}$/.test(period) ? period : ''}
        onChange={(e) => e.target.value && onPeriodChange(e.target.value)}
        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 focus:border-blue-500 focus:outline-none"
      >
        <option value="">Selecionar mês...</option>
        {recentMonths.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
