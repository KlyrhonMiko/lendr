'use client';

import { ArrowRight } from 'lucide-react';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface DataDiffViewProps {
  before?: Record<string, JsonValue>;
  after?: Record<string, JsonValue>;
}

export function DataDiffView({ before, after }: DataDiffViewProps) {
  if (!before && !after) {
    return <p className="text-xs text-muted-foreground italic">No detailed snapshot available.</p>;
  }

  // Get all unique keys from both objects
  const allKeys = Array.from(new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {})
  ])).sort();

  const renderValue = (val: JsonValue | undefined) => {
    if (val === null) return <span className="text-muted-foreground font-mono italic">null</span>;
    if (val === undefined) return <span className="text-muted-foreground font-mono italic">undefined</span>;
    if (typeof val === 'object') return <span className="text-primary font-mono text-[10px]">{JSON.stringify(val)}</span>;
    return <span className="text-foreground font-mono">{String(val)}</span>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-muted/20 border-t border-border/50 animate-in slide-in-from-top-4 duration-300">
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500/50" />
          Previous State
        </h4>
        <div className="bg-background/50 rounded-2xl border border-border/50 overflow-hidden">
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-border/20">
              {allKeys.map(key => {
                const bVal = before?.[key];
                const aVal = after?.[key];
                const hasChanged = JSON.stringify(bVal) !== JSON.stringify(aVal);

                if (bVal === undefined && !hasChanged) return null;

                return (
                  <tr key={key} className={hasChanged ? 'bg-rose-500/5' : ''}>
                    <td className="p-3 font-semibold text-muted-foreground w-1/3 border-r border-border/20">{key}</td>
                    <td className="p-3">{renderValue(bVal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
          New State
        </h4>
        <div className="bg-background/50 rounded-2xl border border-border/10 overflow-hidden shadow-inner">
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-border/20">
              {allKeys.map(key => {
                const bVal = before?.[key];
                const aVal = after?.[key];
                const hasChanged = JSON.stringify(bVal) !== JSON.stringify(aVal);

                if (aVal === undefined && !hasChanged) return null;

                return (
                  <tr key={key} className={hasChanged ? 'bg-emerald-500/10' : ''}>
                    <td className="p-3 font-semibold text-muted-foreground w-1/3 border-r border-border/20">{key}</td>
                    <td className="p-3 flex items-center gap-2">
                      {renderValue(aVal)}
                      {hasChanged && (
                        <div className="ml-auto opacity-50">
                          <ArrowRight className="w-3 h-3 text-emerald-500" />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
