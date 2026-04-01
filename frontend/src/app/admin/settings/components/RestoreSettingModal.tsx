'use client';

import { RefreshCw, X } from 'lucide-react';
import type React from 'react';

export function RestoreSettingModal({
  restoreData,
  setRestoreData,
  onCancel,
  onSubmit,
}: {
  restoreData: { key: string; category: string };
  setRestoreData: React.Dispatch<React.SetStateAction<{ key: string; category: string }>>;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="text-xl font-bold font-heading">Restore Deleted Setting</h2>
          <button onClick={onCancel} aria-label="Close restore setting modal" className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Setting Key</label>
            <input
              required
              type="text"
              value={restoreData.key}
              onChange={(e) => setRestoreData({ ...restoreData, key: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-mono text-sm"
              placeholder="e.g. system_name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Category</label>
            <input
              required
              type="text"
              value={restoreData.category}
              onChange={(e) => setRestoreData({ ...restoreData, category: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl font-semibold bg-secondary hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl font-semibold bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Restore Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

