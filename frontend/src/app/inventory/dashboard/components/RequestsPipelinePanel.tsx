import type { PendingCounts } from '../lib/types';
import Link from 'next/link';
import { Clock, CheckCircle2, PackageOpen, Inbox } from 'lucide-react';

const stages = [
  {
    key: 'pending',
    label: 'Pending Review',
    icon: Clock,
    accent: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    key: 'approved',
    label: 'Approved',
    icon: CheckCircle2,
    accent: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    key: 'released',
    label: 'Out in Field',
    icon: PackageOpen,
    accent: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
];

export function RequestsPipelinePanel({
  counts,
  loading,
}: {
  counts: PendingCounts;
  loading: boolean;
}) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0);

  return (
    <div className="rounded-xl bg-card border border-border flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-base font-semibold font-heading">Request Pipeline</h2>
        <Link
          href="/inventory/requests"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Manage
        </Link>
      </div>

      {loading ? (
        <div className="px-5 pb-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-3 w-8 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 px-5">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2">
            <Inbox className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">All clear</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">No active requests right now.</p>
        </div>
      ) : (
        <div className="px-2 pb-2">
          {stages.map((stage) => {
            const count = counts[stage.key] ?? 0;
            return (
              <div
                key={stage.key}
                className="flex items-center gap-3 px-3 py-3 rounded-lg"
              >
                <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ${stage.bg}`}>
                  <stage.icon className={`w-4 h-4 ${stage.accent}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{stage.label}</p>
                </div>
                <span className="text-lg font-bold font-heading tabular-nums">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
