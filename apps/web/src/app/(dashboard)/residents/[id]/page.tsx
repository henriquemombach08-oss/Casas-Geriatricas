'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useResident, useRemoveResident } from '@/hooks/useResidents';
import { MedicalHistory } from '@/components/residents/MedicalHistory';
import { DocumentList } from '@/components/residents/DocumentList';
import { AlertBadge } from '@/components/residents/AlertBadge';
import { PhotoUpload } from '@/components/residents/PhotoUpload';
import { CarePlansTab } from '@/components/residents/CarePlansTab';
import { RiskScoreWidget } from '@/components/residents/RiskScoreWidget';
import { formatDate } from '@/lib/utils';
import {
  STATUS_LABELS,
  GENDER_LABELS,
  MARITAL_LABELS,
  BLOOD_TYPE_LABELS,
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  active: 'badge-green',
  inactive: 'badge-gray',
  discharged: 'badge-yellow',
};

interface Props {
  params: { id: string };
}

export default function ResidentDetailPage({ params }: Props) {
  const { id } = params;
  const { data: resident, isLoading } = useResident(id);
  const { mutate: removeResident, isPending: removing } = useRemoveResident();
  const [showDelete, setShowDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  if (isLoading) {
    return (
      <div className="card text-center py-16 text-gray-400">
        Carregando residente...
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="card text-center py-16">
        <p className="text-gray-500">Residente não encontrado</p>
        <Link href="/residents" className="text-primary hover:underline text-sm mt-2 block">
          Voltar para lista
        </Link>
      </div>
    );
  }

  const handleDelete = () => {
    removeResident({ id, reason: deleteReason });
    setShowDelete(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-5">
          <PhotoUpload
            residentId={id}
            currentPhotoUrl={resident.photoUrl}
            name={resident.name}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{resident.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              CPF: {resident.cpf} • {resident.age} anos
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={cn('badge', statusColors[resident.status] ?? 'badge-gray')}>
                {STATUS_LABELS[resident.status] ?? resident.status}
              </span>
              {resident.bloodType && resident.bloodType !== 'unknown' && (
                <span className="badge badge-red font-bold">
                  {BLOOD_TYPE_LABELS[resident.bloodType] ?? resident.bloodType}
                </span>
              )}
              {resident.gender && (
                <span className="badge badge-blue">
                  {GENDER_LABELS[resident.gender] ?? resident.gender}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Link href={`/residents/${id}/edit`} className="btn-secondary">
            Editar
          </Link>
          {resident.status === 'active' && (
            <button
              onClick={() => setShowDelete(true)}
              className="btn-danger"
            >
              Desativar
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {resident.hasExpiredDocuments && (
        <AlertBadge
          type="danger"
          title="Documentos Vencidos"
          message="Um ou mais documentos estão vencidos. Renove para manter o cadastro atualizado."
        />
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal info */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Informações Pessoais
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['RG', resident.rg],
                ['Estado Civil', resident.maritalStatus ? MARITAL_LABELS[resident.maritalStatus] : undefined],
                ['Nacionalidade', resident.nationality],
                ['Telefone', resident.phone],
                ['Email', resident.email],
                ['Data de Admissão', formatDate(resident.admissionDate)],
                ['Data de Nascimento', formatDate(resident.birthDate)],
              ].map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <p className="text-gray-500 text-xs">{label}</p>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ) : null,
              )}
            </div>

            {(resident.address || resident.city) && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-gray-500 text-xs mb-1">Endereço</p>
                <p className="text-sm font-medium">
                  {[
                    resident.address,
                    resident.addressNumber,
                    resident.addressComplement,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  {resident.city && (
                    <span className="text-gray-500">
                      {' — '}
                      {resident.city}
                      {resident.state && `/${resident.state}`}
                    </span>
                  )}
                  {resident.zipCode && (
                    <span className="text-gray-400"> ({resident.zipCode})</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Emergency contact */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Contato de Emergência
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Nome', resident.emergencyContactName],
                ['Relação', resident.emergencyContactRelationship],
                ['Telefone', resident.emergencyContactPhone],
                ['Email', resident.emergencyContactEmail],
              ].map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <p className="text-gray-500 text-xs">{label}</p>
                    <p className="font-medium mt-0.5">{value}</p>
                  </div>
                ) : null,
              )}
            </div>
          </div>

          {/* Medical history */}
          <MedicalHistory medicalHistory={resident.medicalHistory} />

          {/* Care Plans */}
          <CarePlansTab residentId={id} />

          {/* Notes */}
          {(resident.notes || resident.specialNeeds) && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                Observações
              </h2>
              {resident.notes && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Notas Gerais</p>
                  <p className="text-sm">{resident.notes}</p>
                </div>
              )}
              {resident.specialNeeds && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Necessidades Especiais</p>
                  <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">
                    {resident.specialNeeds}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <RiskScoreWidget residentId={id} />
          <DocumentList residentId={id} documents={resident.documents} />

          {/* Quick links */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Acesso Rápido
            </h2>
            <div className="space-y-2">
              <Link
                href={`/medications?residentId=${id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 transition-colors"
              >
                <span>💊</span> Medicamentos
              </Link>
              <Link
                href={`/visitors?residentId=${id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 transition-colors"
              >
                <span>👥</span> Visitantes
              </Link>
              <Link
                href={`/financial?residentId=${id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 transition-colors"
              >
                <span>💰</span> Financeiro
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Desativar Residente</h3>
            <p className="text-sm text-gray-500 mb-4">
              O residente será marcado como inativo. Os dados serão preservados.
            </p>
            <div className="mb-4">
              <label className="label">Motivo (opcional)</label>
              <input
                className="input"
                placeholder="Ex: transferência, alta médica..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={removing}
                className="btn-danger"
              >
                {removing ? 'Processando...' : 'Confirmar'}
              </button>
              <button onClick={() => setShowDelete(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
