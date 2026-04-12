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

const statusColors: Record<string, string> = {
  active: 'badge-green',
  inactive: 'badge-gray',
  discharged: 'badge-yellow',
};

export function ResidentTable({ residents }: Props) {
  if (residents.length === 0) {
    return (
      <div className="card text-center py-16 text-gray-400">
        <p className="text-5xl mb-3">👴</p>
        <p className="font-medium">Nenhum residente encontrado</p>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 dark:bg-gray-700">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Residente
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">
                CPF
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">
                Idade
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">
                Tipo Sang.
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden xl:table-cell">
                Admissão
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Status
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {residents.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-semibold text-gray-500">
                          {r.name.charAt(0)}
                        </div>
                      )}
                      {r.hasExpiredDocuments && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" title="Documentos vencidos" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{r.name}</p>
                      <p className="text-xs text-gray-500">{r.phone ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell font-mono text-xs">
                  {r.cpf}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                  {r.age} anos
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {r.bloodType ? (
                    <span className="badge badge-red font-semibold">
                      {BLOOD_TYPE_LABELS[r.bloodType] ?? r.bloodType}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden xl:table-cell text-xs">
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
                    className="text-primary hover:underline text-xs font-medium"
                  >
                    Ver detalhes
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
