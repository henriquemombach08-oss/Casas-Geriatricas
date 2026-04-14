'use client';

import Link from 'next/link';

const SECTIONS = [
  {
    href: '/reports/medications',
    icon: '💊',
    title: 'Medicamentos',
    description: 'Adesão ao tratamento, logs de administração, tendências mensais.',
    color: 'blue',
  },
  {
    href: '/reports/residents',
    icon: '👴',
    title: 'Residentes',
    description: 'Ocupação, distribuição etária, diagnósticos e nível de cuidado.',
    color: 'purple',
  },
  {
    href: '/reports/financial',
    icon: '💰',
    title: 'Financeiro',
    description: 'Fluxo de caixa, inadimplência, previsão e contas a receber.',
    color: 'green',
  },
  {
    href: '/reports/staff',
    icon: '📋',
    title: 'Pessoal',
    description: 'Escalas, horas trabalhadas, absenteísmo e pontualidade.',
    color: 'orange',
  },
];

const colorMap: Record<string, string> = {
  blue:   'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200',
  purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200',
  green:  'bg-green-50 text-green-600 hover:bg-green-100 border-green-200',
  orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200',
};

const iconBg: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  green:  'bg-green-100 text-green-600',
  orange: 'bg-orange-100 text-orange-600',
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="mt-1 text-gray-500">
          Análises e exportações para tomada de decisão.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`flex items-start gap-4 rounded-xl border p-6 transition-colors ${colorMap[s.color]}`}
          >
            <div className={`rounded-lg p-3 text-2xl ${iconBg[s.color]}`}>
              {s.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm opacity-80">{s.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
