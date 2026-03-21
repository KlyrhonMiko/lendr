'use client';

import { Plus, RefreshCw } from 'lucide-react';

export function SettingsHeader({
  onOpenRestore,
  onOpenNew,
}: {
  onOpenRestore: () => void;
  onOpenNew: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold font-heading mb-2">System Administration</h1>
        <p className="text-muted-foreground text-lg">Manage platform-level configurations and system-wide parameters.</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onOpenRestore}
          className="flex items-center gap-2.5 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg text-sm font-semibold border border-border hover:bg-secondary/80 transition-colors active:scale-[0.98]"
        >
          <RefreshCw className="w-5 h-5" strokeWidth={2.5} />
          Restore Setting
        </button>

        <button
          onClick={onOpenNew}
          className="flex items-center gap-2.5 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          Update Param
        </button>
      </div>
    </div>
  );
}

