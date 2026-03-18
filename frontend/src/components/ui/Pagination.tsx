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
    <div className={`flex items-center justify-between px-4 py-3 border-t border-border bg-background/30 ${className}`}>
      {/* Left: record range */}
      <p className="text-sm text-muted-foreground">
        Showing{' '}
        <span className="font-semibold text-foreground">{start}–{end}</span>
        {' '}of{' '}
        <span className="font-semibold text-foreground">{meta.total}</span>
        {' '}results
      </p>

      <div className="flex items-center gap-4">
        {/* Per-page selector */}
        {onPerPageChange && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows</span>
            <select
              value={perPage}
              onChange={(e) => {
                onPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-8 px-2 rounded-lg bg-input/30 border border-border text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              {perPageOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}

        {/* Page controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page number pills */}
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
                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm select-none">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  className={`min-w-[2rem] h-8 px-2 rounded-lg text-sm font-semibold transition-all ${
                    p === currentPage
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              )
            )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Page x of y */}
        <span className="text-sm text-muted-foreground hidden sm:block">
          Page <span className="font-semibold text-foreground">{currentPage}</span> / {totalPages}
        </span>
      </div>
    </div>
  );
}
