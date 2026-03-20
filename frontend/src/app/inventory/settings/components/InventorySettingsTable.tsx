'use client';

import { Settings, Sliders } from 'lucide-react';
import type { SystemSetting } from '../lib/types';

export function InventorySettingsTable({
  settings,
  loading,
  activeTab,
}: {
  settings: SystemSetting[];
  loading: boolean;
  activeTab: 'inventory' | 'borrower';
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
            <th className="p-4 pl-6">Key &amp; Description</th>
            <th className="p-4">Category</th>
            <th className="p-4 pr-6">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {loading ? (
            <tr>
              <td colSpan={3} className="p-12 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10" />
                  <p className="font-medium">Loading parameters...</p>
                </div>
              </td>
            </tr>
          ) : settings.map((setting) => (
            <tr key={`${setting.category}-${setting.key}`} className="hover:bg-muted/30 transition-colors group">
              <td className="p-4 pl-6 max-w-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground font-mono text-sm">{setting.key}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {setting.description || 'No description provided.'}
                    </span>
                  </div>
                </div>
              </td>
              <td className="p-4">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-secondary text-secondary-foreground border border-border">
                  {setting.category}
                </span>
              </td>
              <td className="p-4 pr-6">
                <code className="text-sm px-2 py-1 rounded bg-muted font-mono border border-border/50 text-indigo-400">
                  {setting.value}
                </code>
              </td>
            </tr>
          ))}
          {!loading && settings.length === 0 && (
            <tr>
              <td colSpan={3} className="p-12 text-center text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-10" />
                No configuration settings found for {activeTab}.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

