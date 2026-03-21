import type { CategoryBreakdown } from '../lib/types';

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

const COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-orange-500',
];

export function InventoryBreakdownPanel({
  breakdown,
  loading,
}: {
  breakdown: CategoryBreakdown[];
  loading: boolean;
}) {
  const total = breakdown.reduce((s, b) => s + b.count, 0);

  return (
    <div className="rounded-xl bg-card border border-border flex flex-col">
      <div className="px-5 pt-5 pb-4">
        <h2 className="text-base font-semibold font-heading">By Category</h2>
      </div>

      {loading ? (
        <div className="px-5 pb-5 space-y-3">
          <div className="h-2 w-full bg-muted rounded-full animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between animate-pulse">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-3 w-6 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : breakdown.length === 0 ? (
        <div className="px-5 pb-5">
          <p className="text-sm text-muted-foreground">No equipment added yet.</p>
        </div>
      ) : (
        <div className="px-5 pb-5">
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-4">
            {breakdown.map((b, i) => {
              const pct = total > 0 ? (b.count / total) * 100 : 0;
              return (
                <div
                  key={b.category}
                  className={`${COLORS[i % COLORS.length]} rounded-full transition-all`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                  title={`${capitalize(b.category)}: ${b.count}`}
                />
              );
            })}
          </div>
          <div className="space-y-2.5">
            {breakdown.map((b, i) => (
              <div key={b.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLORS[i % COLORS.length]}`} />
                  <span className="text-sm text-foreground truncate">{capitalize(b.category)}</span>
                </div>
                <span className="text-sm font-medium tabular-nums text-muted-foreground ml-2">
                  {b.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
