'use client';

import { useState } from 'react';
import { useResidents } from '@/hooks/useResidents';
import { useCreateFinancial } from '@/hooks/useFinancial';
import { CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from '@/types/financial';
import type { FinancialType, FinancialCategory, PaymentMethod, CreateFinancialInput } from '@/types/financial';

const TYPES: { value: FinancialType; label: string }[] = [
  { value: 'charge',     label: 'Cobrança' },
  { value: 'payment',    label: 'Pagamento' },
  { value: 'refund',     label: 'Devolução' },
  { value: 'adjustment', label: 'Ajuste' },
  { value: 'fine',       label: 'Multa' },
];

const CATEGORIES: FinancialCategory[] = ['monthly_fee', 'medicine', 'supplies', 'extra_service', 'other'];
const PAYMENT_METHODS: PaymentMethod[] = ['pix', 'bank_transfer', 'cash', 'credit_card', 'debit_card', 'boleto', 'check', 'other'];

const today = () => new Date().toISOString().split('T')[0]!;

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ChargeForm({ onSuccess, onCancel }: Props) {
  const { data: residentsData } = useResidents({ page: 1, limit: 200, status: 'active' });
  const create = useCreateFinancial();

  const [form, setForm] = useState<CreateFinancialInput>({
    resident_id: '',
    type: 'charge',
    amount: 0,
    description: '',
    category: 'monthly_fee',
    issue_date: today(),
    due_date: '',
    paid_date: '',
    payment_method: undefined,
    reference_month: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof CreateFinancialInput, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.resident_id || !form.description || !form.amount || form.amount <= 0) {
      setError('Preencha residente, descrição e valor.');
      return;
    }
    setError(null);
    const payload: CreateFinancialInput = {
      ...form,
      due_date:       form.due_date       || undefined,
      paid_date:      form.paid_date      || undefined,
      reference_month: form.reference_month || undefined,
      notes:          form.notes          || undefined,
    };
    create.mutate(payload, {
      onSuccess: () => onSuccess?.(),
      onError: (err) => setError(String(err)),
    });
  };

  const isPayment = form.type === 'payment';

  return (
    <div className="space-y-4">
      {/* Residente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Residente *</label>
        <select value={form.resident_id} onChange={(e) => set('resident_id', e.target.value)} className="input w-full">
          <option value="">Selecionar residente...</option>
          {residentsData?.residents.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value as FinancialType)} className="input w-full">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value as FinancialCategory)} className="input w-full">
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Ex: Mensalidade Abril 2026"
          className="input w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Valor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount || ''}
            onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
            className="input w-full"
          />
        </div>

        {/* Data emissão */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data emissão *</label>
          <input
            type="date"
            value={form.issue_date}
            onChange={(e) => set('issue_date', e.target.value)}
            className="input w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Vencimento */}
        {!isPayment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento</label>
            <input
              type="date"
              value={form.due_date ?? ''}
              onChange={(e) => set('due_date', e.target.value)}
              className="input w-full"
            />
          </div>
        )}

        {/* Data pagamento */}
        {isPayment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data pagamento</label>
            <input
              type="date"
              value={form.paid_date ?? ''}
              onChange={(e) => set('paid_date', e.target.value)}
              className="input w-full"
            />
          </div>
        )}

        {/* Mês referência */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mês referência</label>
          <input
            type="month"
            value={form.reference_month?.slice(0, 7) ?? ''}
            onChange={(e) => set('reference_month', e.target.value ? e.target.value + '-01' : '')}
            className="input w-full"
          />
        </div>
      </div>

      {/* Forma de pagamento */}
      {isPayment && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pagamento</label>
          <select
            value={form.payment_method ?? ''}
            onChange={(e) => set('payment_method', e.target.value || undefined)}
            className="input w-full"
          >
            <option value="">Selecionar...</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
          </select>
        </div>
      )}

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Observações adicionais..."
          className="w-full text-sm border rounded-lg p-2"
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={create.isPending}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {create.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
