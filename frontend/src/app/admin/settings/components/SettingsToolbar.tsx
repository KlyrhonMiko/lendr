'use client';

import { Search, Plus, RefreshCw, Filter } from 'lucide-react';
import type { PaginationMeta } from '@/lib/api';
import { FormSelect } from '@/components/ui/form-select';

export function SettingsToolbar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  systemFilter,
  onSystemFilterChange,
  meta,
  categories,
  systems,
  onOpenRestore,
  onOpenNew
}: {
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (v: string) => void;
  systemFilter: string;
  onSystemFilterChange: (v: string) => void;
  meta: PaginationMeta | null;
  categories: string[];
  systems: string[];
  onOpenRestore: () => void;
  onOpenNew: () => void;
}) {
  const categoryOptions = [
    { label: 'All Categories', key: '' },
    ...categories.map(c => ({ label: c, key: c }))
  ];

  const systemOptions = [
    { label: 'All Systems', key: '' },
    ...systems.map(s => ({ label: s, key: s }))
  ];

  return (
    <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
      {/* Search Input */}
      <div className="relative w-72">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by key or description..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-sm font-medium"
        />
      </div>

      {/* Filter Icon (Visual Only) */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/30 rounded-lg border border-border/50">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Filters</span>
      </div>

      {/* System Filter */}
      <div className="w-44">
        <FormSelect
          value={systemFilter}
          onChange={(value) => onSystemFilterChange(value)}
          options={systemOptions}
          placeholder="All Systems"
        />
      </div>

      {/* Category Filter */}
      <div className="w-48">
        <FormSelect
          value={categoryFilter}
          onChange={(value) => onCategoryFilterChange(value)}
          options={categoryOptions}
          placeholder="All Categories"
        />
      </div>

      {/* Action Area */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onOpenRestore}
          title="Restore a deleted parameter"
          className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 text-secondary-foreground rounded-lg text-xs font-bold border border-border hover:bg-secondary transition-all active:scale-[0.98]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Restore
        </button>

        <button
          onClick={onOpenNew}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-xs font-bold shadow-sm shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          New Config
        </button>

        {meta && (
          <div className="h-6 w-px bg-border mx-2 hidden lg:block" />
        )}

        {meta && (
          <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-tight hidden lg:inline">
            {meta.total} Result{meta.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
