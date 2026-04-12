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
    <div className="flex flex-col gap-3 p-4 border-b border-border">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Type a name, email, or employee ID to search..."
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

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground mr-1">Filter by:</span>

        <FilterSelect
          value={roleFilter}
          onChange={onRoleFilterChange}
          options={roles.map(r => ({ key: r.key, label: r.value }))}
          placeholder="All Roles"
          align="start"
        />

        <FilterSelect
          value={shiftFilter}
          onChange={onShiftFilterChange}
          options={shifts.map(s => ({ key: s.key, label: s.value }))}
          placeholder="All Shifts"
          align="start"
        />

        <div className="flex bg-muted/50 rounded-lg border border-border p-1">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onStatusFilterChange(s)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all capitalize ${statusFilter === s
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
