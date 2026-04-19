'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface AuditLog {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  pinVerified: boolean;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; role: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
  'medication.administer': 'Administrou medicamento',
  'medication.create': 'Criou medicamento',
  'medication.update': 'Atualizou medicamento',
  'medication.delete': 'Excluiu medicamento',
  'resident.create': 'Cadastrou residente',
  'resident.update': 'Atualizou residente',
  'resident.delete': 'Excluiu residente',
  'financial.create': 'Criou cobrança',
  'financial.update': 'Atualizou registro financeiro',
  'financial.delete': 'Excluiu registro financeiro',
  'care_plan.create': 'Criou plano de cuidado',
  'care_plan.update': 'Atualizou plano de cuidado',
  'care_plan.delete': 'Excluiu plano de cuidado',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', from: '', to: '' });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (filters.action) params.set('action', filters.action);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);

    api
      .get<{ data: { logs: AuditLog[]; pagination: { total: number } } }>(`/audit?${params}`)
      .then((r) => {
        setLogs(r.data.data?.logs ?? []);
        setTotal(r.data.data?.pagination?.total ?? 0);
      })
      .catch(() => {
        setLogs([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, filters]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Log de Auditoria</h1>
        <p className="text-sm text-stone-500 mt-1">Todas as ações críticas realizadas no sistema</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-stone-200 p-4">
        <select
          value={filters.action}
          onChange={(e) => { setFilters((f) => ({ ...f, action: e.target.value })); setPage(1); }}
          className="text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as ações</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => { setFilters((f) => ({ ...f, from: e.target.value })); setPage(1); }}
          className="text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => { setFilters((f) => ({ ...f, to: e.target.value })); setPage(1); }}
          className="text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Data/Hora</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Funcionário</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Ação</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Entidade</th>
              <th className="text-center px-4 py-3 font-medium text-stone-600">PIN</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-stone-400">Carregando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-stone-400">Nenhum registro encontrado</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 text-stone-600 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {log.user ? (
                      <div>
                        <p className="font-medium text-stone-900">{log.user.name}</p>
                        <p className="text-xs text-stone-400">{log.user.role}</p>
                      </div>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-stone-900">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {log.entityType && <span className="text-xs bg-stone-100 px-2 py-1 rounded-full">{log.entityType}</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {log.pinVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                        ✓ Verificado
                      </span>
                    ) : (
                      <span className="text-stone-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-400 text-xs font-mono">{log.ipAddress ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-between text-sm text-stone-500">
          <span>{total} registros no total</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg border border-stone-200 disabled:opacity-40 hover:bg-stone-50"
            >
              Anterior
            </button>
            <span className="px-3 py-1">Página {page}</span>
            <button
              disabled={page * 50 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border border-stone-200 disabled:opacity-40 hover:bg-stone-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
