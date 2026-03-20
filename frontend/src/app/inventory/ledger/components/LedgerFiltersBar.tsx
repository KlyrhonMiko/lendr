'use client';

import { Search } from 'lucide-react';

export function LedgerFiltersBar({
  itemId,
  onItemIdChange,
  movementType,
  onMovementTypeChange,
}: {
  itemId: string;
  onItemIdChange: (v: string) => void;
  movementType: string;
  onMovementTypeChange: (v: string) => void;
}) {
  return (
    <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
      <div className="relative w-72">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Item ID..."
          value={itemId}
          onChange={(e) => onItemIdChange(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border text-sm font-medium"
        />
      </div>
      <select
        value={movementType}
        onChange={(e) => onMovementTypeChange(e.target.value)}
        className="h-10 px-4 rounded-xl bg-input/30 border border-border text-sm font-medium"
      >
        <option value="">All Movement Types</option>
        <option value="procurement">Procurement</option>
        <option value="manual_adjustment">Adjustments</option>
        <option value="borrow_release">Releases</option>
        <option value="borrow_return">Returns</option>
        <option value="damage">Damage/Loss</option>
      </select>
    </div>
  );
}

