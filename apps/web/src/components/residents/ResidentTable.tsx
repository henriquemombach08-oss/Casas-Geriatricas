'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ResidentSummary } from '@/types/resident';
import { STATUS_LABELS, BLOOD_TYPE_LABELS } from '@/lib/formatters';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Props {
  residents: ResidentSummary[];
}

const AVATAR_BG = ['#92400E', '#064E3B', '#9A3412', '#78350F', '#57534E', '#44403C'];

const statusColors: Record<string, string> = {
  active: 'badge-green',
  inactive: 'badge-gray',
  discharged: 'badge-yellow',
};

export function ResidentTable({ residents }: Props) {
  if (residents.length === 0) {
    return (
      <div className="card text-center py-16 text-stone-400">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-stone-300">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />
          </svg>
        </div>
        <p className="font-medium text-stone-600">Nenhum residente encontrado</p>
        <p className="text-sm text-stone-400 mt-1">Tente ajustar os filtros de busca.</p>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50 dark:bg-stone-800">
              {['Residente', 'CPF', 'Idade', 'Tipo Sang.', 'Admissão', 'Status', ''].map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500',
                    i === 1 && 'hidden md:table-cell',
                    (i === 2 || i === 3) && 'hidden lg:table-cell',
                    i === 4 && 'hidden xl:table-cell',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {residents.map((r, idx) => (
              <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 shrink-0">
                      {r.photoUrl ? (
                        <Image
                          src={r.photoUrl}
                          alt={r.name}
                          fill
                          className="rounded-full object-cover"
                          sizes="36px"
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: AVATAR_BG[idx % AVATAR_BG.length] }}
                        >
                          {(r.name ?? '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      {r.hasExpiredDocuments && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" title="Documentos vencidos" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900 dark:text-stone-100">{r.name}</p>
                      <p className="text-xs text-stone-500">{r.phone ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-500 hidden md:table-cell font-mono text-xs">
                  {r.cpf}
                </td>
                <td className="px-4 py-3 text-stone-600 dark:text-stone-400 hidden lg:table-cell">
                  {r.age} anos
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {r.bloodType ? (
                    <span className="badge badge-red font-semibold">
                      {BLOOD_TYPE_LABELS[r.bloodType] ?? r.bloodType}
                    </span>
                  ) : (
                    <span className="text-stone-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-stone-500 hidden xl:table-cell text-xs">
                  {formatDate(r.admissionDate)}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('badge', statusColors[r.status] ?? 'badge-gray')}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/residents/${r.id}`}
                    className="text-primary hover:text-primary-700 text-xs font-semibold transition-colors"
                  >
                    Ver detalhes →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
