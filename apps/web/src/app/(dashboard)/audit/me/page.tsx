'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface MyLog {
  id: string;
  action: string;
  entityType: string | null;
  pinVerified: boolean;
  createdAt: string;
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

export default function MyAuditPage() {
  const [logs, setLogs] = useState<MyLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ data: { logs: MyLog[]; pagination: { total: number } } }>(`/audit/me?page=${page}&limit=20`)
      .then((r) => {
        setLogs(r.data.data.logs);
        setTotal(r.data.data.pagination.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Minhas Atividades</h1>
        <p className="text-sm text-stone-500 mt-1">Histórico das suas ações no sistema</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Data/Hora</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Ação</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Tipo</th>
              <th className="text-center px-4 py-3 font-medium text-stone-600">PIN usado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12 text-stone-400">Carregando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-stone-400">Nenhuma atividade registrada</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 text-stone-600 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 font-medium text-stone-900">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </td>
                  <td className="px-4 py-3">
                    {log.entityType && (
                      <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{log.entityType}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {log.pinVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                        ✓ Sim
                      </span>
                    ) : (
                      <span className="text-xs text-stone-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-stone-500">
          <span>{total} registros</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg border border-stone-200 disabled:opacity-40 hover:bg-stone-50">Anterior</button>
            <span className="px-3 py-1">Página {page}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-stone-200 disabled:opacity-40 hover:bg-stone-50">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}
