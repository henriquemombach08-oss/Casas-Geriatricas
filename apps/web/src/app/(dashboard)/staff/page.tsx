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
  customRole?: string;
  phone?: string;
  active: boolean;
  photo?: string | null;
}

interface ApiResponse<T> { success: boolean; data: T; }

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  director: 'Diretor(a)',
  nurse: 'Enfermeiro(a)',
  caregiver: 'Cuidador(a)',
  admin_finance: 'Financeiro',
  cook: 'Cozinheiro(a)',
  other: 'Outro',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-primary-100 text-primary',
  director: 'bg-stone-200 text-stone-700',
  nurse: 'bg-emerald-100 text-emerald-700',
  caregiver: 'bg-amber-100 text-amber-700',
  admin_finance: 'bg-yellow-100 text-yellow-700',
  cook: 'bg-orange-100 text-orange-700',
  other: 'bg-stone-100 text-stone-600',
};

const AVATAR_BG = ['#92400E', '#064E3B', '#9A3412', '#78350F', '#57534E', '#44403C'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function getRoleDisplay(member: StaffMember): string {
  if (member.role === 'other' && member.customRole) return member.customRole;
  return ROLE_LABELS[member.role] ?? member.role;
}

const emptyForm = { name: '', email: '', password: '', role: 'caregiver', customRole: '', phone: '' };

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
    mutationFn: () => api.post('/users', {
      ...form,
      customRole: form.role === 'other' ? form.customRole : undefined,
    }),
    onSuccess: () => {
      toast.success('Funcionário criado com sucesso');
      setShowForm(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Não foi possível criar o funcionário.'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffMember> }) =>
      api.put(`/users/${id}`, data),
    onSuccess: () => {
      toast.success('Funcionário atualizado');
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: () => toast.error('Ops, não foi possível atualizar o funcionário.'),
  });

  const resetPw = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post(`/users/${id}/reset-password`, { password }),
    onSuccess: () => {
      toast.success('Senha redefinida com sucesso');
      setResetId(null);
      setNewPassword('');
    },
    onError: () => toast.error('Ops, não foi possível redefinir a senha.'),
  });

  const activeCount = staff.filter(s => s.active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-title">Equipe</p>
          <h1 className="page-title">Funcionários</h1>
          <p className="mt-1 text-sm text-stone-500">
            {activeCount} ativo{activeCount !== 1 ? 's' : ''} · {staff.length} total
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          Novo funcionário
        </button>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-stone-800 dark:text-stone-100">Novo funcionário</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nome completo *</label>
              <input className="input" placeholder="Ex: Maria Silva" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" placeholder="maria@casa.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Senha *</label>
              <input type="password" className="input" placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cargo *</label>
              <select className="input" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value, customRole: '' }))}>
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            {form.role === 'other' && (
              <div>
                <label className="label">Cargo personalizado *</label>
                <input className="input" placeholder="Ex: Fisioterapeuta" value={form.customRole}
                  onChange={e => setForm(f => ({ ...f, customRole: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="label">Telefone</label>
              <input className="input" placeholder="(11) 99999-9999" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => create.mutate()}
              disabled={!form.name || !form.email || !form.password || (form.role === 'other' && !form.customRole) || create.isPending}
              className="btn-primary text-sm"
            >
              {create.isPending ? 'Salvando...' : 'Criar funcionário'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-semibold text-stone-900 dark:text-stone-100">Redefinir senha</h3>
            <div>
              <label className="label">Nova senha</label>
              <input type="password" className="input" placeholder="Mínimo 8 caracteres" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} />
              {newPassword.length > 0 && newPassword.length < 8 && (
                <p className="mt-1.5 text-xs text-red-500">A senha precisa ter pelo menos 8 caracteres.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => resetPw.mutate({ id: resetId, password: newPassword })}
                disabled={newPassword.length < 8 || resetPw.isPending}
                className="btn-primary text-sm flex-1"
              >
                {resetPw.isPending ? 'Salvando...' : 'Redefinir'}
              </button>
              <button onClick={() => { setResetId(null); setNewPassword(''); }}
                className="btn-secondary text-sm flex-1">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-stone-400">Carregando...</div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-stone-400">Nenhum funcionário cadastrado ainda.</div>
        ) : (
          <table className="min-w-full divide-y divide-stone-100 text-sm">
            <thead className="bg-stone-50 dark:bg-stone-800">
              <tr>
                {['Funcionário', 'Email', 'Cargo', 'Telefone', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white dark:bg-stone-900">
              {staff.map((s, i) => (
                <tr key={s.id} className="hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {s.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.photo} alt={s.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: AVATAR_BG[i % AVATAR_BG.length] }}
                        >
                          {getInitials(s.name)}
                        </div>
                      )}
                      <span className="font-medium text-stone-900 dark:text-stone-100">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[s.role] ?? 'bg-stone-100 text-stone-600'}`}>
                      {getRoleDisplay(s)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{s.phone || '—'}</td>
                  <td className="px-4 py-3">
                    {editingId === s.id ? (
                      <select
                        className="input text-xs py-1 w-24"
                        defaultValue={s.active ? 'true' : 'false'}
                        onChange={e => update.mutate({ id: s.id, data: { active: e.target.value === 'true' } })}
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    ) : (
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                        {s.active ? 'Ativo' : 'Inativo'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      {editingId === s.id ? (
                        <button onClick={() => setEditingId(null)} className="text-xs text-stone-500 hover:text-stone-700 font-medium">Fechar</button>
                      ) : (
                        <button onClick={() => setEditingId(s.id)} className="text-xs text-primary hover:text-primary-700 font-medium">Editar</button>
                      )}
                      <button onClick={() => setResetId(s.id)} className="text-xs text-stone-500 hover:text-stone-700 font-medium">Senha</button>
                    </div>
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
