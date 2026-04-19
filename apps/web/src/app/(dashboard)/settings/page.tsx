'use client';

import { useState } from 'react';
import { getStoredUser, logout } from '@/lib/auth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const user = getStoredUser();
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (pwForm.next.length < 8) {
      toast.error('Nova senha deve ter no mínimo 8 caracteres');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      toast.success('Senha alterada com sucesso');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch {
      toast.error('Senha atual incorreta');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Configurações</h1>
        <p className="mt-1 text-sm text-stone-500">Preferências da conta</p>
      </div>

      {/* Perfil */}
      <div className="card space-y-3">
        <h2 className="text-base font-semibold text-stone-800 dark:text-white">Meu Perfil</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white text-xl font-bold">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="font-medium text-stone-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-stone-500">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Alterar senha */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-stone-800 dark:text-white">Alterar Senha</h2>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="label">Senha atual</label>
            <input type="password" className="input" value={pwForm.current}
              onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
          </div>
          <div>
            <label className="label">Nova senha</label>
            <input type="password" className="input" value={pwForm.next}
              onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
          </div>
          <div>
            <label className="label">Confirmar nova senha</label>
            <input type="password" className="input" value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
          </div>
          <button type="submit" disabled={pwLoading || !pwForm.current || !pwForm.next}
            className="btn-primary text-sm">
            {pwLoading ? 'Salvando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>

      {/* Aparência */}
      <div className="card">
        <h2 className="mb-3 text-base font-semibold text-stone-800 dark:text-white">Aparência</h2>
        <p className="text-sm text-stone-500">
          Use o botão 🌙 / ☀️ na barra superior para alternar entre modo claro e escuro.
          A preferência é salva automaticamente.
        </p>
      </div>

      {/* Sair */}
      <div className="card">
        <h2 className="mb-3 text-base font-semibold text-stone-800 dark:text-white">Sessão</h2>
        <button onClick={logout} className="btn-danger text-sm">
          Sair da conta
        </button>
      </div>
    </div>
  );
}
