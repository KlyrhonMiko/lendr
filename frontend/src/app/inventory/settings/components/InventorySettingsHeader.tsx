'use client';

import { Plus } from 'lucide-react';

export function InventorySettingsHeader({ onUpdate }: { onUpdate: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold font-heading mb-2">Inventory Settings</h1>
        <p className="text-muted-foreground text-lg">Configure inventory rules and borrower portal behavior.</p>
      </div>
      <button
        onClick={onUpdate}
        type="button"
        className="flex items-center gap-2.5 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors active:scale-[0.98]"
      >
        <Plus className="w-5 h-5" strokeWidth={2.5} />
        Update Setting
      </button>
    </div>
  );
}

