import { UserInsights } from '../lib/types';
import { Users, TrendingUp } from 'lucide-react';

export function UserDistributionPanel({ insights, loading }: { insights: UserInsights | null; loading: boolean }) {
  const maxTrend = Math.max(...(insights?.trends.map(t => t.count) || []), 1);

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Users className="w-5 h-5 text-emerald-500" />
        <h3 className="font-semibold text-sm">User Insights</h3>
      </div>
      <div className="p-4 flex-1 space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded" />
          </div>
        ) : !insights ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic">
            No user data available
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Role Distribution</p>
              <div className="grid grid-cols-2 gap-2">
                {insights.distribution.map((dist) => (
                  <div key={dist.role} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-[10px] text-muted-foreground capitalize">{dist.role}</p>
                    <p className="text-lg font-bold">{dist.count}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Registration Trend (30d)</p>
                <TrendingUp className="w-3 h-3 text-emerald-500" />
              </div>
              <div className="h-20 flex items-end gap-1">
                {insights.trends.map((day) => (
                  <div
                    key={day.date}
                    className="flex-1 bg-emerald-500/20 group relative cursor-help rounded-t-[1px]"
                    style={{ height: `${Math.max(4, (day.count / maxTrend) * 100)}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-popover border border-border rounded text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {day.count} on {day.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
