'use client';

import { Search } from 'lucide-react';
import type { StatusTab } from '../lib/types';
import { STATUS_TABS } from '../lib/types';

export function RequestsToolbar({
  searchInput,
  onSearchInputChange,
  statusFilter,
  onStatusFilterChange,
}: {
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  statusFilter: StatusTab;
  onStatusFilterChange: (v: StatusTab) => void;
}) {
  return (
    <div className="p-4 border-b border-border bg-background/50 flex items-center gap-4 flex-wrap">
      {/* Search by borrower ID */}
      <div className="relative w-72">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by borrower ID..."
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
        />
      </div>

      {/* Status tabs — now drives server filter */}
      <div className="flex bg-input/30 p-1 rounded-xl border border-border overflow-x-auto flex-1">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => onStatusFilterChange(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize whitespace-nowrap ${
              statusFilter === s ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            type="button"
          >
            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  );
}

