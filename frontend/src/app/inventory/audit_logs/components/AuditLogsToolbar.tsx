'use client';

import { useState } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { FilterSelect } from '@/components/ui/filter-select';
import { cn } from '@/lib/utils';

const ENTITY_OPTIONS = [
  { key: 'inventory', value: 'Inventory' },
  { key: 'inventory_unit', value: 'Unit' },
  { key: 'inventory_movement', value: 'Movement' },
  { key: 'inventory_batch', value: 'Batch' },
  { key: 'borrow', value: 'Borrow' },
  { key: 'borrow_request', value: 'Borrow Request' },
];

const TIMEFRAME_OPTIONS = [
  { key: '24h', value: 'Last 24 Hours' },
  { key: '7d', value: 'Last 7 Days' },
  { key: '30d', value: 'Last 30 Days' },
];

export function AuditLogsToolbar({
  search,
  onSearchChange,
  entityFilter,
  onEntityFilterChange,
  timeframe,
  onTimeframeChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  entityFilter: string;
  onEntityFilterChange: (v: string) => void;
  timeframe: string;
  onTimeframeChange: (v: string) => void;
}) {

  const hasActiveFilters = entityFilter || timeframe;

  return (
    <div className="flex flex-col gap-3 p-4 border-b border-border">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Type actor ID or search..."
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

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground mr-1">Filter by:</span>

        <FilterSelect
          value={entityFilter}
          onChange={onEntityFilterChange}
          options={ENTITY_OPTIONS.map(o => ({ key: o.key, label: o.value }))}
          placeholder="All Inventory"
          align="start"
        />

        <FilterSelect
          value={timeframe}
          onChange={onTimeframeChange}
          options={TIMEFRAME_OPTIONS.map(o => ({ key: o.key, label: o.value }))}
          placeholder="All Time"
          align="start"
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onEntityFilterChange('');
              onTimeframeChange('');
            }}
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
