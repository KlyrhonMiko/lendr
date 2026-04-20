'use client';

import { useState } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import type { AuthConfig } from '../api';
import { FilterSelect } from '@/components/ui/filter-select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function UsersToolbar({
  search,
  onSearchChange,
  roles,
  roleFilter,
  onRoleFilterChange,
  shifts,
  shiftFilter,
  onShiftFilterChange,
  statusFilter,
  onStatusFilterChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  roles: AuthConfig[];
  roleFilter: string;
  onRoleFilterChange: (v: string) => void;
  shifts: AuthConfig[];
  shiftFilter: string;
  onShiftFilterChange: (v: string) => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusFilterChange: (v: 'all' | 'active' | 'inactive') => void;
}) {

  const hasActiveFilters = roleFilter || shiftFilter || statusFilter !== 'all';

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 border-b border-border">
      {/* Search */}
      <div className="relative flex-1 min-[400px]:">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Type a name, email, or employee ID to search..."
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

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/70 whitespace-nowrap">Filters:</span>

          <FilterSelect
            value={roleFilter}
            onChange={onRoleFilterChange}
            options={roles.map(r => ({ key: r.key, label: r.value }))}
            placeholder="All Roles"
            align="end"
          />

          <FilterSelect
            value={shiftFilter}
            onChange={onShiftFilterChange}
            options={shifts.map(s => ({ key: s.key, label: s.value }))}
            placeholder="All Shifts"
            align="end"
          />
        </div>

        <div className="flex bg-muted/50 rounded-lg border border-border p-1 h-10 items-center">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onStatusFilterChange(s)}
              className={`px-3 h-8 text-[13px] font-semibold rounded-md transition-all capitalize whitespace-nowrap ${statusFilter === s
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {s}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onRoleFilterChange('');
              onShiftFilterChange('');
              onStatusFilterChange('all');
            }}
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
