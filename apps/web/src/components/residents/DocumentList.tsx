'use client';

import { useState } from 'react';
import type { ResidentDocument } from '@/types/resident';
import { formatDate } from '@/lib/utils';
import { DOC_TYPE_LABELS } from '@/lib/formatters';
import { AlertBadge } from './AlertBadge';
import { DocumentUpload } from './DocumentUpload';
import { cn } from '@/lib/utils';

interface Props {
  residentId: string;
  documents: ResidentDocument[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  valid: { label: 'Válido', className: 'badge-green' },
  expiring_soon: { label: 'Vencendo', className: 'badge-yellow' },
  expired: { label: 'Vencido', className: 'badge-red' },
};

export function DocumentList({ residentId, documents }: Props) {
  const [showUpload, setShowUpload] = useState(false);

  const expiredDocs = documents.filter((d) => d.status === 'expired');
  const expiringSoonDocs = documents.filter((d) => d.status === 'expiring_soon');

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Documentos ({documents.length})
        </h2>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="text-sm text-primary hover:underline font-medium"
        >
          {showUpload ? '✕ Fechar' : '+ Upload'}
        </button>
      </div>

      {expiredDocs.length > 0 && (
        <AlertBadge
          type="danger"
          title={`${expiredDocs.length} documento(s) vencido(s)`}
          message="Renove os documentos para manter o cadastro atualizado"
          className="mb-3"
        />
      )}
      {expiringSoonDocs.length > 0 && (
        <AlertBadge
          type="warning"
          title={`${expiringSoonDocs.length} documento(s) vencendo em breve`}
          message="Renove antes do vencimento"
          className="mb-3"
        />
      )}

      {showUpload && (
        <div className="mb-4 p-3 border border-dashed rounded-lg">
          <DocumentUpload
            residentId={residentId}
            onSuccess={() => setShowUpload(false)}
          />
        </div>
      )}

      <div className="space-y-2">
        {documents.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nenhum documento enviado</p>
        ) : (
          documents.map((doc) => {
            const status = statusConfig[doc.status] ?? statusConfig['valid']!;
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-lg shrink-0">
                  {doc.fileType === 'pdf' ? '📄' : '🖼️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {doc.name ?? DOC_TYPE_LABELS[doc.type] ?? doc.type}
                  </p>
                  <p className="text-xs text-gray-500">
                    {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                    {doc.expiresAt && ` • Vence: ${formatDate(doc.expiresAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('badge', status.className)}>{status.label}</span>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Ver
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
