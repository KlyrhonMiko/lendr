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
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold font-heading tracking-tight text-foreground">System Administration</h1>
        <p className="text-muted-foreground/80 text-sm">Centralized platform configuration, system operations, and security audit tools.</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenRestore}
          className="flex items-center gap-2 px-4 py-2 bg-secondary/50 text-secondary-foreground rounded-lg text-sm font-semibold border border-border hover:bg-secondary transition-all active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4" />
          Restore Parameter
        </button>

        <button
          onClick={onOpenNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-sm font-semibold shadow-sm shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New Configuration
        </button>
      </div>
    </div>
  );
}

