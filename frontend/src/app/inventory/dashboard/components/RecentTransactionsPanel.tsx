import type { RecentTransaction } from '../lib/types';
import Link from 'next/link';
import { Activity, Clock, Loader2 } from 'lucide-react';

export function RecentTransactionsPanel({
  recent,
  loading,
}: {
  recent: RecentTransaction[];
  loading: boolean;
}) {
  return (
    <div className="md:col-span-2 p-6 rounded-2xl bg-card border border-border flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold font-heading">Recent Transactions</h2>
        <Link href="/inventory/requests" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
          View All
        </Link>
      </div>

      <div className="flex-1 space-y-3">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Fetching activity log...</p>
          </div>
        ) : recent.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center bg-background rounded-xl border border-border/50 border-dashed">
            <Clock className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground text-sm font-medium">No recent transactions</p>
          </div>
        ) : (
          recent.map((item) => (
            <div
              key={item.request_id}
              className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-2 rounded-lg ${
                    item.status === 'released'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : item.status === 'returned'
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-amber-500/10 text-amber-500'
                  }`}
                >
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">
                    {item.items[0]?.qty_requested ?? 0}x {item.items[0]?.item_id ?? 'N/A'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Requested by <span className="text-foreground font-medium">{item.borrower_user_id ?? 'Unknown'}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  {item.status}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.request_date}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

