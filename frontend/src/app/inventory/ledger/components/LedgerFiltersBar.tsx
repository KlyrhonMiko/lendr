'use client';

import { useState } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';

const MOVEMENT_TYPE_OPTIONS = [
  { key: '', value: 'All movement types' },
  { key: 'procurement', value: 'Procurement' },
  { key: 'manual_adjustment', value: 'Adjustment' },
  { key: 'borrow_release', value: 'Release' },
  { key: 'borrow_return', value: 'Return' },
  { key: 'damage', value: 'Damage or loss' },
];

export function LedgerFiltersBar({
  itemId,
  onItemIdChange,
  movementType,
  onMovementTypeChange,
  meta,
}: {
  itemId: string;
  onItemIdChange: (v: string) => void;
  movementType: string;
  onMovementTypeChange: (v: string) => void;
  meta?: PaginationMeta | null;
}) {
  const [movementTypeOpen, setMovementTypeOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 p-4 border-b border-border">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search equipment..."
            value={itemId}
            onChange={(e) => onItemIdChange(e.target.value)}
            className="w-full h-11 pl-12 pr-4 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all"
          />
          {itemId && (
            <button
              type="button"
              onClick={() => onItemIdChange('')}
              aria-label="Clear item search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {meta && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{meta.total}</span>
            <span>movement{meta.total !== 1 ? 's' : ''} total</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground mr-1">Filter by:</span>
        <Popover open={movementTypeOpen} onOpenChange={setMovementTypeOpen}>
          <PopoverTrigger
            type="button"
            className="h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm font-medium cursor-pointer flex items-center gap-2"
          >
            <span className="truncate">
              {MOVEMENT_TYPE_OPTIONS.find((o) => o.key === movementType)?.value ?? 'All movement types'}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={4} className="w-48 p-1 max-h-60 overflow-y-auto">
            {MOVEMENT_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.key || 'all'}
                type="button"
                onClick={() => {
                  onMovementTypeChange(opt.key);
                  setMovementTypeOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left',
                  movementType === opt.key ? 'bg-indigo-500/10 text-indigo-600 font-medium' : 'hover:bg-muted'
                )}
              >
                <Check className={cn('w-4 h-4 shrink-0', movementType === opt.key ? 'opacity-100' : 'opacity-0')} />
                {opt.value}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
