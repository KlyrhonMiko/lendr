'use client';

import { Plus } from 'lucide-react';

export function InventoryItemsHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold font-heading mb-2">Inventory Management</h1>
        <p className="text-muted-foreground text-lg">Add, edit, and track your equipment catalog.</p>
      </div>
      <button
        onClick={onAdd}
        className="px-6 py-2.5 bg-indigo-500 text-white font-semibold rounded-full hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25"
      >
        <Plus className="w-4 h-4" />
        Add Equipment
      </button>
    </div>
  );
}

