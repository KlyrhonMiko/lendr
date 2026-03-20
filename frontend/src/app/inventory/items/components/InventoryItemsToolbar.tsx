'use client';

import { Filter, Search, X } from 'lucide-react';
import type { ConfigRead } from '../api';
import type { PaginationMeta } from '@/lib/api';

export function InventoryItemsToolbar({
  search,
  onSearchChange,
  showFilters,
  onShowFiltersChange,
  hasActiveFilters,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  meta,
  classificationFilter,
  onClassificationFilterChange,
  itemTypeFilter,
  onItemTypeFilterChange,
  conditionFilter,
  onConditionFilterChange,
  classifications,
  itemTypes,
  conditions,
  onClearExpandedFilters,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  showFilters: boolean;
  onShowFiltersChange: (v: boolean) => void;
  hasActiveFilters: boolean;
  categoryFilter: string;
  onCategoryFilterChange: (v: string) => void;
  categories: ConfigRead[];
  meta: PaginationMeta | null;
  classificationFilter: string;
  onClassificationFilterChange: (v: string) => void;
  itemTypeFilter: string;
  onItemTypeFilterChange: (v: string) => void;
  conditionFilter: string;
  onConditionFilterChange: (v: string) => void;
  classifications: ConfigRead[];
  itemTypes: ConfigRead[];
  conditions: ConfigRead[];
  onClearExpandedFilters: () => void;
}) {
  const hasExpandedFilters = classificationFilter || itemTypeFilter || conditionFilter;

  return (
    <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
        />
      </div>

      {/* Filter toggle */}
      <button
        onClick={() => onShowFiltersChange(!showFilters)}
        className={`flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-semibold transition-all ${
          hasActiveFilters
            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
            : 'bg-input/30 border-border text-muted-foreground hover:text-foreground'
        }`}
      >
        <Filter className="w-4 h-4" />
        Filters
        {hasActiveFilters && <span className="ml-1 w-2 h-2 rounded-full bg-indigo-400" />}
      </button>

      {/* Inline category input */}
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryFilterChange(e.target.value)}
        className="h-10 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium w-48 cursor-pointer appearance-none"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.key} value={c.key}>
            {c.value}
          </option>
        ))}
      </select>

      {/* Count badge */}
      {meta && (
        <span className="ml-auto text-sm text-muted-foreground font-medium">
          {meta.total} item{meta.total !== 1 ? 's' : ''}
        </span>
      )}

      {/* Expanded filter panel */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-border bg-background/30 flex items-center gap-3 flex-wrap animate-in slide-in-from-top-2 duration-150 w-full">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold">Classification:</span>
            <select
              value={classificationFilter}
              onChange={(e) => onClassificationFilterChange(e.target.value)}
              className="h-8 px-3 rounded-lg bg-input/30 border border-border text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="">All classifications</option>
              {classifications.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.key.charAt(0).toUpperCase() + c.key.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold">Item Type:</span>
            <select
              value={itemTypeFilter}
              onChange={(e) => onItemTypeFilterChange(e.target.value)}
              className="h-8 px-3 rounded-lg bg-input/30 border border-border text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="">All types</option>
              {itemTypes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.key.charAt(0).toUpperCase() + t.key.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold">Condition:</span>
            <select
              value={conditionFilter}
              onChange={(e) => onConditionFilterChange(e.target.value)}
              className="h-8 px-3 rounded-lg bg-input/30 border border-border text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="">All conditions</option>
              {conditions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.key.charAt(0).toUpperCase() + c.key.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {hasExpandedFilters && (
            <button
              onClick={onClearExpandedFilters}
              className="ml-auto text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              type="button"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

