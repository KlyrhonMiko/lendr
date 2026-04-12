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
    <div className="flex flex-col gap-3 p-4 border-b border-border">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-11 pl-12 pr-4 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{meta.total}</span>
            <span>item{meta.total !== 1 ? 's' : ''} total</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground mr-1">Filter by:</span>

        <FilterSelect
          value={categoryFilter}
          onChange={onCategoryFilterChange}
          options={categoryOptions.map(o => ({ key: o.key, label: o.value }))}
          placeholder="All categories"
          align="start"
        />

        <FilterSelect
          value={classificationFilter}
          onChange={onClassificationFilterChange}
          options={classificationOptions.map(o => ({ key: o.key, label: o.value }))}
          placeholder="All classifications"
          align="start"
        />

        <FilterSelect
          value={itemTypeFilter}
          onChange={onItemTypeFilterChange}
          options={itemTypeOptions.map(o => ({ key: o.key, label: o.value }))}
          placeholder="All types"
          align="start"
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="h-10 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
