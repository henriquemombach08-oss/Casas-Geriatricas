'use client';

import { cn } from '@/lib/utils';

interface Props {
  page: number;
  pages: number;
  total: number;
  limit?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pages, total, limit = 20, onPageChange }: Props) {
  if (pages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const getPages = () => {
    const result: (number | '...')[] = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
        result.push(i);
      } else if (result[result.length - 1] !== '...') {
        result.push('...');
      }
    }
    return result;
  };

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-gray-500">
        Mostrando <span className="font-medium">{start}–{end}</span> de{' '}
        <span className="font-medium">{total}</span> resultados
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Anterior
        </button>

        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'w-9 h-9 text-sm rounded-lg border transition-colors',
                p === page
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-300 hover:bg-gray-50',
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
