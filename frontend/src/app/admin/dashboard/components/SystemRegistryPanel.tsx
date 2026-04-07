import { SystemRegistry } from '../lib/types';
import { Database, FileText } from 'lucide-react';

export function SystemRegistryPanel({ registry, loading }: { registry: SystemRegistry[]; loading: boolean }) {
  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Database className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-sm">System Registry Scale</h3>
      </div>
      <div className="p-6 flex-1">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
          </div>
        ) : (
          <div className="grid gap-3">
            {registry.map((item) => (
              <div
                key={item.entity}
                className="flex items-center justify-between p-3.5 rounded-lg bg-muted/40 border border-border/50 group hover:border-indigo-500/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-indigo-500/10 text-indigo-500">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{item.entity}</span>
                </div>
                <span className="text-xl font-bold font-heading">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
