'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Visitor {
  id: string;
  residentId: string;
  residentName?: string;
  visitorName: string;
  visitorCpf?: string;
  visitorPhone?: string;
  relationship?: string;
  scheduledAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  notes?: string;
}

interface ApiResponse<T> { success: boolean; data: T; }

export default function VisitorsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ visitorName: '', visitorPhone: '', relationship: '', notes: '' });
  const [showForm, setShowForm] = useState(false);

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ['visitors'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Visitor[]>>('/visitors?limit=50');
      return res.data.data ?? [];
    },
  });

  const checkIn = useMutation({
    mutationFn: (id: string) => api.post(`/visitors/${id}/check-in`, {}),
    onSuccess: () => { toast.success('Check-in registrado'); qc.invalidateQueries({ queryKey: ['visitors'] }); },
  });

  const checkOut = useMutation({
    mutationFn: (id: string) => api.post(`/visitors/${id}/check-out`, {}),
    onSuccess: () => { toast.success('Check-out registrado'); qc.invalidateQueries({ queryKey: ['visitors'] }); },
  });

  const create = useMutation({
    mutationFn: () => api.post('/visitors', form),
    onSuccess: () => {
      toast.success('Visita registrada');
      setShowForm(false);
      setForm({ visitorName: '', visitorPhone: '', relationship: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['visitors'] });
    },
    onError: () => toast.error('Erro ao registrar visita'),
  });

  const fmt = (d?: string) => d ? new Date(d).toLocaleString('pt-BR') : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visitantes</h1>
          <p className="mt-1 text-sm text-gray-500">Registro de visitas dos residentes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm"
        >
          + Nova Visita
        </button>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Registrar Visita</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nome do visitante *</label>
              <input className="input" value={form.visitorName}
                onChange={e => setForm(f => ({ ...f, visitorName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.visitorPhone}
                onChange={e => setForm(f => ({ ...f, visitorPhone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Parentesco</label>
              <input className="input" placeholder="ex: filho, cônjuge" value={form.relationship}
                onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} />
            </div>
            <div>
              <label className="label">Observações</label>
              <input className="input" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => create.mutate()} disabled={!form.visitorName || create.isPending}
              className="btn-primary text-sm">
              {create.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : visitors.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma visita registrada hoje.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Visitante', 'Parentesco', 'Entrada', 'Saída', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:bg-gray-900">
              {visitors.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium">{v.visitorName}</td>
                  <td className="px-4 py-3 text-gray-500">{v.relationship || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(v.checkedInAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(v.checkedOutAt)}</td>
                  <td className="px-4 py-3">
                    {!v.checkedInAt && (
                      <button onClick={() => checkIn.mutate(v.id)}
                        className="text-xs rounded-lg bg-green-100 px-2 py-1 text-green-700 hover:bg-green-200">
                        Check-in
                      </button>
                    )}
                    {v.checkedInAt && !v.checkedOutAt && (
                      <button onClick={() => checkOut.mutate(v.id)}
                        className="text-xs rounded-lg bg-red-100 px-2 py-1 text-red-700 hover:bg-red-200">
                        Check-out
                      </button>
                    )}
                    {v.checkedOutAt && (
                      <span className="text-xs text-gray-400">Concluída</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
