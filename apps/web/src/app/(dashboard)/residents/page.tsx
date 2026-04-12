'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useResidents } from '@/hooks/useResidents';
import { ResidentTable } from '@/components/residents/ResidentTable';
import { Pagination } from '@/components/shared/Pagination';
import type { ResidentStatus } from '@/types/resident';

export default function ResidentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ResidentStatus>('active');
  const [sortBy, setSortBy] = useState<'name' | 'admissionDate' | 'birthDate'>('name');

  const { data, isLoading, error } = useResidents({ page, limit: 20, search, status, sortBy });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Residentes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {data?.pagination.total ?? 0} residentes no total
          </p>
        </div>
        <Link href="/residents/new" className="btn-primary">
          + Novo Residente
        </Link>
      </div>

      {/* Filters */}
      <div className="card py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="search"
            placeholder="Buscar por nome, CPF ou contato..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as ResidentStatus); setPage(1); }}
            className="input"
          >
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="discharged">Transferidos</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="input"
          >
            <option value="name">Ordenar: Nome</option>
            <option value="admissionDate">Ordenar: Admissão</option>
            <option value="birthDate">Ordenar: Idade</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="card text-center py-12 text-gray-400">Carregando...</div>
      ) : error ? (
        <div className="card text-center py-12 text-red-500">Erro ao carregar residentes</div>
      ) : (
        <>
          <ResidentTable residents={data?.residents ?? []} />
          <Pagination
            page={page}
            pages={data?.pagination.pages ?? 1}
            total={data?.pagination.total ?? 0}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
