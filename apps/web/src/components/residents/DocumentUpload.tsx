'use client';

import { useRef, useState } from 'react';
import { useUploadDocument } from '@/hooks/useResidents';
import { DOC_TYPE_LABELS } from '@/lib/formatters';

interface Props {
  residentId: string;
  onSuccess?: () => void;
}

export function DocumentUpload({ residentId, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [meta, setMeta] = useState({
    type: 'rg',
    name: '',
    issueDate: '',
    expiresAt: '',
  });
  const { mutate, isPending } = useUploadDocument(residentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    mutate(
      { file, meta },
      {
        onSuccess: () => {
          onSuccess?.();
          if (fileRef.current) fileRef.current.value = '';
          setMeta({ type: 'rg', name: '', issueDate: '', expiresAt: '' });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tipo *</label>
          <select
            className="input"
            value={meta.type}
            onChange={(e) => setMeta((m) => ({ ...m, type: e.target.value }))}
            required
          >
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Nome do documento</label>
          <input
            className="input"
            placeholder="Ex: RG - Frente"
            value={meta.name}
            onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Data de Emissão</label>
          <input
            type="date"
            className="input"
            value={meta.issueDate}
            onChange={(e) => setMeta((m) => ({ ...m, issueDate: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Data de Vencimento</label>
          <input
            type="date"
            className="input"
            value={meta.expiresAt}
            onChange={(e) => setMeta((m) => ({ ...m, expiresAt: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className="label">Arquivo *</label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="input py-1.5 file:mr-3 file:border-0 file:bg-primary file:text-white file:rounded file:px-2 file:py-1 file:text-xs cursor-pointer"
          required
        />
        <p className="text-xs text-stone-400 mt-1">PDF, JPEG ou PNG • Máx 10MB</p>
      </div>

      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? 'Enviando...' : 'Enviar Documento'}
      </button>
    </form>
  );
}
