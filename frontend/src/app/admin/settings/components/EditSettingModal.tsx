'use client';

import { X } from 'lucide-react';
import type React from 'react';
import type { SystemSettingCreate } from '../api';

export function EditSettingModal({
  editingKey,
  formData,
  setFormData,
  onClose,
  onSubmit,
}: {
  editingKey: string | null;
  formData: SystemSettingCreate & { description: string };
  setFormData: React.Dispatch<React.SetStateAction<SystemSettingCreate & { description: string }>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="text-xl font-bold font-heading">{editingKey ? 'Edit Setting' : 'New Configuration'}</h2>
          <button onClick={onClose} aria-label="Close edit setting modal" className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Setting Key</label>
            <input
              required
              disabled={!!editingKey}
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-mono text-sm disabled:opacity-50"
              placeholder="e.g. system_name"
            />
            {!editingKey && (
              <p className="text-[10px] text-muted-foreground italic">Keys cannot be changed after creation.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Value</label>
            <input
              required
              type="text"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
            />
          </div>

          {!editingKey && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                  placeholder="general"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full h-24 p-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium resize-none"
                  placeholder="What does this setting control?"
                />
              </div>
            </>
          )}

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold bg-secondary hover:bg-secondary/80 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-3 rounded-xl font-semibold bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 transition-colors">
              {editingKey ? 'Update Value' : 'Create Setting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

