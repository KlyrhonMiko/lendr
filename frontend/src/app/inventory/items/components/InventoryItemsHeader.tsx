'use client';

import { Plus, Package } from 'lucide-react';

export function InventoryItemsHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-indigo-500/10 items-center justify-center text-indigo-500">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">Equipment Catalog</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage and track all your equipment in one place</p>
        </div>
      </div>
      <button
        onClick={onAdd}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-600 active:scale-[0.98] transition-all shadow-md shadow-indigo-500/20 text-sm"
      >
        <Plus className="w-5 h-5" />
        Add Equipment
      </button>
    </div>
  );
}
