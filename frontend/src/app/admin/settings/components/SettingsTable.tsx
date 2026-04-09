'use client';

import { Edit2, Loader2, Lock, Settings as SettingsIcon, Sliders, Trash2 } from 'lucide-react';
import type { SystemSetting } from '../api';

export function SettingsTable({
  settings,
  loading,
  onEdit,
  onDelete,
}: {
  settings: SystemSetting[];
  loading: boolean;
  onEdit: (setting: SystemSetting) => void;
  onDelete: (key: string, category: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
            <th className="p-4 pl-6">Key &amp; Description</th>
            <th className="p-4 text-center">Category</th>
            <th className="p-4">Value</th>
            <th className="p-4 text-center font-mono text-[10px]">Last Modified</th>
            <th className="p-4 pr-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {loading ? (
            <tr>
              <td colSpan={4} className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Loading parameters...</p>
              </td>
            </tr>
          ) : settings.map((setting) => (
            <tr key={`${setting.category}-${setting.key}`} className="hover:bg-muted/30 transition-colors group">
              <td className="p-4 pl-6 max-w-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground font-mono text-sm">{setting.key}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{setting.description || 'No description provided.'}</span>
                    {setting.crucial && (
                      <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                        <Lock className="h-3 w-3" />
                        Required
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-4">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-secondary text-secondary-foreground border border-border">
                  {setting.category}
                </span>
              </td>
              <td className="p-4">
                <code className="text-xs px-2 py-1 rounded bg-muted font-mono border border-border/50 text-primary">
                  {setting.value}
                </code>
              </td>
              <td className="p-4 text-center">
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                  {setting.last_modified || new Date().toISOString().split('T')[0]}
                </span>
              </td>
              <td className="p-4 pr-6 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(setting)}
                    className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    type="button"
                    title={setting.crucial ? 'Required setting cannot be edited from UI' : 'Edit'}
                    disabled={setting.crucial}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(setting.key, setting.category)}
                    className="p-2 hover:bg-rose-500/10 rounded-lg text-muted-foreground hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    type="button"
                    title={setting.crucial ? 'Required setting cannot be deleted' : 'Delete'}
                    disabled={setting.crucial}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!loading && settings.length === 0 && (
            <tr>
              <td colSpan={4} className="p-12 text-center text-muted-foreground">
                <SettingsIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                No configuration settings found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

