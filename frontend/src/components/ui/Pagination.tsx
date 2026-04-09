'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/lib/api';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
  className?: string;
}

const DEFAULT_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export function Pagination({
  meta,
  onPageChange,
  onPerPageChange,
  perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
  className = '',
}: PaginationProps) {
  const currentPage = meta.page ?? Math.floor(meta.offset / meta.limit) + 1;
  const perPage = meta.per_page ?? meta.limit;
  const totalPages = Math.max(1, Math.ceil(meta.total / perPage));

  const start = meta.offset + 1;
  const end = Math.min(meta.offset + perPage, meta.total);

  if (meta.total === 0) return null;

  return (
    <div className={`flex items-center justify-between px-5 py-3.5 border-t border-border ${className}`}>
      <p className="text-sm text-muted-foreground">
        Showing{' '}
        <span className="font-medium text-foreground">{start}&ndash;{end}</span>
        {' '}of{' '}
        <span className="font-medium text-foreground">{meta.total}</span>
      </p>

      <div className="flex items-center gap-2">
        {onPerPageChange && (
          <select
            value={perPage}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
            className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none"
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}/page
              </option>
            ))}
          </select>
        )}

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => {
            if (totalPages <= 7) return true;
            return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
          })
          .reduce<(number | '...')[]>((acc, p, idx, arr) => {
            if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
              acc.push('...');
            }
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm select-none">&hellip;</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`min-w-[2rem] h-8 px-2 rounded-lg text-sm font-bold transition-all ${p === currentPage
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/10'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}

              >
                {p}
              </button>
            )
          )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
