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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="section-title">Cadastros</p>
          <h1 className="page-title">Residentes</h1>
          <p className="text-sm text-stone-500 mt-1">
            {data?.pagination.total ?? 0} residentes no total
          </p>
        </div>
        <Link href="/residents/new" className="btn-primary">
          Novo residente
        </Link>
      </div>

      {/* Filters */}
      <div className="card py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <svg viewBox="0 0 20 20" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="search"
              placeholder="Buscar por nome, CPF ou contato..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-9"
            />
          </div>
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
        <div className="card text-center py-12 text-stone-400">Carregando...</div>
      ) : error ? (
        <div className="card text-center py-12 text-red-500">Ops, não foi possível carregar os residentes.</div>
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
