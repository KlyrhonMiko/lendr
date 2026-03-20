'use client';

import { Search } from 'lucide-react';
import type { PaginationMeta } from '@/lib/api';

export function SettingsToolbar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  meta,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (v: string) => void;
  meta: PaginationMeta | null;
}) {
  return (
    <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
      <div className="relative w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by key or description..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
        />
      </div>

      <input
        type="text"
        placeholder="Filter by category..."
        value={categoryFilter}
        onChange={(e) => onCategoryFilterChange(e.target.value)}
        className="h-10 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium w-48"
      />

      {meta && (
        <span className="ml-auto text-sm text-muted-foreground font-medium">
          {meta.total} setting{meta.total !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

