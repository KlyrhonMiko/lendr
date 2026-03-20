'use client';

import { Search } from 'lucide-react';

export function InventorySettingsToolbar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (v: string) => void;
}) {
  return (
    <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
      <div className="relative w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search keys..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
        />
      </div>

      <input
        type="text"
        placeholder="Category..."
        value={categoryFilter}
        onChange={(e) => onCategoryFilterChange(e.target.value)}
        className="h-10 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium w-48"
      />
    </div>
  );
}

