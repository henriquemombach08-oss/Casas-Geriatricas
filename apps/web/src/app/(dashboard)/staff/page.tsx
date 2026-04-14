'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  active: boolean;
}

interface ApiResponse<T> { success: boolean; data: T; }

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  nurse: 'Enfermeiro(a)',
  caregiver: 'Cuidador(a)',
  receptionist: 'Recepcionista',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  nurse: 'bg-blue-100 text-blue-700',
  caregiver: 'bg-green-100 text-green-700',
  receptionist: 'bg-yellow-100 text-yellow-700',
};

const emptyForm = { name: '', email: '', password: '', role: 'caregiver', phone: '' };

export default function StaffPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState(emptyForm);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<StaffMember[]>>('/users?active=all');
      return res.data.data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => {
      toast.success('Funcionário criado com sucesso');
      setShowForm(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Erro ao criar funcionário'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffMember> }) =>
      api.put(`/users/${id}`, data),
    onSuccess: () => {
      toast.success('Funcionário atualizado');
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: () => toast.error('Erro ao atualizar funcionário'),
  });

  const resetPw = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post(`/users/${id}/reset-password`, { password }),
    onSuccess: () => {
      toast.success('Senha redefinida');
      setResetId(null);
      setNewPassword('');
    },
    onError: () => toast.error('Erro ao redefinir senha'),
  });

  const activeCount = staff.filter(s => s.active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Funcionários</h1>
          <p className="mt-1 text-sm text-gray-500">{activeCount} ativo{activeCount !== 1 ? 's' : ''} · {staff.length} total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          + Novo Funcionário
        </button>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white">Novo Funcionário</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nome completo *</label>
              <input className="input" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Senha *</label>
              <input type="password" className="input" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cargo *</label>
              <select className="input" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => create.mutate()}
              disabled={!form.name || !form.email || !form.password || create.isPending}
              className="btn-primary text-sm">
              {create.isPending ? 'Salvando...' : 'Criar Funcionário'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Redefinir Senha</h3>
            <div>
              <label className="label">Nova senha</label>
              <input type="password" className="input" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => resetPw.mutate({ id: resetId, password: newPassword })}
                disabled={newPassword.length < 8 || resetPw.isPending}
                className="btn-primary text-sm flex-1">
                {resetPw.isPending ? 'Salvando...' : 'Redefinir'}
              </button>
              <button onClick={() => { setResetId(null); setNewPassword(''); }}
                className="btn-secondary text-sm flex-1">Cancelar</button>
            </div>
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="text-xs text-red-500">Mínimo 8 caracteres</p>
            )}
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum funcionário cadastrado.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Nome', 'Email', 'Cargo', 'Telefone', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:bg-gray-900">
              {staff.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-700'}`}>
                      {ROLE_LABELS[s.role] ?? s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.phone || '—'}</td>
                  <td className="px-4 py-3">
                    {editingId === s.id ? (
                      <select className="input text-xs py-1 w-24"
                        defaultValue={s.active ? 'true' : 'false'}
                        onChange={e => update.mutate({ id: s.id, data: { active: e.target.value === 'true' } })}>
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    ) : (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.active ? 'Ativo' : 'Inativo'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {editingId === s.id ? (
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">Fechar</button>
                    ) : (
                      <button onClick={() => setEditingId(s.id)} className="text-xs text-blue-600 hover:text-blue-800">Editar</button>
                    )}
                    <button onClick={() => setResetId(s.id)} className="text-xs text-orange-600 hover:text-orange-800">Reset senha</button>
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
