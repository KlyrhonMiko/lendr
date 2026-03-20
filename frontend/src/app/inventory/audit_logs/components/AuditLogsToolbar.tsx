'use client';

import { Search } from 'lucide-react';

export function AuditLogsToolbar({
  search,
  onSearchChange,
  actionFilter,
  onActionFilterChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  actionFilter: string;
  onActionFilterChange: (v: string) => void;
}) {
  return (
    <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
      <div className="relative w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter by Actor ID (e.g. ST-001)..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
        />
      </div>

      <select
        value={actionFilter}
        onChange={(e) => onActionFilterChange(e.target.value)}
        className="h-10 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
      >
        <option value="">All Actions</option>
        <option value="created">Created</option>
        <option value="updated">Updated</option>
        <option value="deleted">Deleted</option>
        <option value="approved">Approved</option>
        <option value="released">Released</option>
        <option value="returned">Returned</option>
      </select>
    </div>
  );
}

