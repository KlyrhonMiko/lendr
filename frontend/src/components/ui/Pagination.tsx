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
    <div className={`flex items-center justify-between px-6 py-3 border-t border-border ${className}`}>
      <p className="text-xs text-muted-foreground">
        Showing{' '}
        <span className="font-medium text-foreground">{start}–{end}</span>
        {' '}of{' '}
        <span className="font-medium text-foreground">{meta.total}</span>
        {' '}results
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-xs select-none">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  className={`min-w-[1.75rem] h-7 px-1.5 rounded-md text-xs font-medium transition-all ${
                    p === currentPage
                      ? 'bg-indigo-500 text-white'
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
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="text-xs text-muted-foreground hidden sm:block">
          Page <span className="font-medium text-foreground">{currentPage}</span> / {totalPages}
        </span>
      </div>
    </div>
  );
}
