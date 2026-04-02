'use client';

import { useState } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const ENTITY_OPTIONS = [
  { key: '', value: 'All Inventory' },
  { key: 'inventory', value: 'Inventory' },
  { key: 'inventory_unit', value: 'Unit' },
  { key: 'inventory_movement', value: 'Movement' },
  { key: 'inventory_batch', value: 'Batch' },
  { key: 'borrow', value: 'Borrow' },
  { key: 'borrow_request', value: 'Borrow Request' },
];

const TIMEFRAME_OPTIONS = [
  { key: 'all', value: 'All Time' },
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
  const [entityFilterOpen, setEntityFilterOpen] = useState(false);
  const [timeframeFilterOpen, setTimeframeFilterOpen] = useState(false);
  const hasActiveFilters = entityFilter || timeframe !== 'all';

  return (
    <div className="flex flex-col gap-3 p-4 border-b border-border">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Type actor ID or search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-11 pl-12 pr-4 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all"
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

        <Popover open={entityFilterOpen} onOpenChange={setEntityFilterOpen}>
          <PopoverTrigger
            type="button"
            className="h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm font-medium cursor-pointer flex items-center gap-2"
          >
            <span className="truncate">
              {ENTITY_OPTIONS.find((e) => e.key === entityFilter)?.value ?? 'All Inventory'}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={4} className="w-48 p-1 max-h-60 overflow-y-auto">
            {ENTITY_OPTIONS.map((opt) => (
              <button
                key={opt.key || 'all'}
                type="button"
                onClick={() => {
                  onEntityFilterChange(opt.key);
                  setEntityFilterOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left',
                  entityFilter === opt.key ? 'bg-indigo-500/10 text-indigo-600 font-medium' : 'hover:bg-muted'
                )}
              >
                <Check className={cn('w-4 h-4 shrink-0', entityFilter === opt.key ? 'opacity-100' : 'opacity-0')} />
                {opt.value}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Popover open={timeframeFilterOpen} onOpenChange={setTimeframeFilterOpen}>
          <PopoverTrigger
            type="button"
            className="h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm font-medium cursor-pointer flex items-center gap-2"
          >
            <span className="truncate">
              {TIMEFRAME_OPTIONS.find((t) => t.key === timeframe)?.value ?? 'All Time'}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={4} className="w-48 p-1 max-h-60 overflow-y-auto">
            {TIMEFRAME_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onTimeframeChange(opt.key);
                  setTimeframeFilterOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left',
                  timeframe === opt.key ? 'bg-indigo-500/10 text-indigo-600 font-medium' : 'hover:bg-muted'
                )}
              >
                <Check className={cn('w-4 h-4 shrink-0', timeframe === opt.key ? 'opacity-100' : 'opacity-0')} />
                {opt.value}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onEntityFilterChange('');
              onTimeframeChange('all');
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
