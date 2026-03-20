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
          className="px-6 py-2.5 bg-secondary text-foreground font-semibold rounded-full hover:bg-secondary/80 transition-all flex items-center gap-2 border border-border"
        >
          <RefreshCw className="w-4 h-4" />
          Restore Setting
        </button>

        <button
          onClick={onOpenNew}
          className="px-6 py-2.5 bg-indigo-500 text-white font-semibold rounded-full hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4" />
          Update Param
        </button>
      </div>
    </div>
  );
}

