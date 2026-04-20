'use client';

import { useState } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { FilterSelect } from '@/components/ui/filter-select';
import { cn } from '@/lib/utils';
import type { ConfigRead } from '../api';
import type { PaginationMeta } from '@/lib/api';

export function InventoryItemsToolbar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  meta,
  classificationFilter,
  onClassificationFilterChange,
  itemTypeFilter,
  onItemTypeFilterChange,
  classifications,
  itemTypes,
  onClearExpandedFilters,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (v: string) => void;
  categories: ConfigRead[];
  meta: PaginationMeta | null;
  classificationFilter: string;
  onClassificationFilterChange: (v: string) => void;
  itemTypeFilter: string;
  onItemTypeFilterChange: (v: string) => void;
  classifications: ConfigRead[];
  itemTypes: ConfigRead[];
  onClearExpandedFilters: () => void;
}) {


  const hasActiveFilters = categoryFilter || classificationFilter || itemTypeFilter;

  const categoryOptions = categories.map((c) => ({ key: c.key, value: c.value }));
  const classificationOptions = classifications.map((c) => ({
    key: c.key,
    value: c.key.charAt(0).toUpperCase() + c.key.slice(1),
  }));
  const itemTypeOptions = itemTypes.map((t) => ({
    key: t.key,
    value: t.key.charAt(0).toUpperCase() + t.key.slice(1),
  }));
  const clearAllFilters = () => {
    onCategoryFilterChange('');
    onClearExpandedFilters();
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 border-b border-border">
      <div className="flex items-center gap-3 flex-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-11 pl-12 pr-4 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {meta && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
            <span className="font-semibold text-foreground">{meta.total}</span>
            <span className="uppercase tracking-tight opacity-70">items total</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/70 whitespace-nowrap">Filters:</span>

          <FilterSelect
            value={categoryFilter}
            onChange={onCategoryFilterChange}
            options={categoryOptions.map(o => ({ key: o.key, label: o.value }))}
            placeholder="All categories"
            align="end"
          />

          <FilterSelect
            value={classificationFilter}
            onChange={onClassificationFilterChange}
            options={classificationOptions.map(o => ({ key: o.key, label: o.value }))}
            placeholder="Classifications"
            align="end"
          />

          <FilterSelect
            value={itemTypeFilter}
            onChange={onItemTypeFilterChange}
            options={itemTypeOptions.map(o => ({ key: o.key, label: o.value }))}
            placeholder="Types"
            align="end"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="h-10 px-3 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
