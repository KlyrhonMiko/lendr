'use client';

import { Search, Shield, Clock } from 'lucide-react';
import type { AuthConfig } from '../api';

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
  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-border bg-background/50 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ID, name, email or username..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              className="h-12 pl-11 pr-10 rounded-2xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-xs font-bold appearance-none min-w-[160px]"
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.value}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={shiftFilter}
              onChange={(e) => onShiftFilterChange(e.target.value)}
              className="h-12 pl-11 pr-10 rounded-2xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-xs font-bold appearance-none min-w-[160px]"
            >
              <option value="">All Shifts</option>
              {shifts.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.value}
                </option>
              ))}
            </select>
          </div>

          <div className="flex bg-input/30 p-1 rounded-2xl border border-border">
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onStatusFilterChange(s)}
                className={`px-4 py-1.5 text-[10px] font-bold rounded-xl transition-all uppercase tracking-wider ${
                  statusFilter === s
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

