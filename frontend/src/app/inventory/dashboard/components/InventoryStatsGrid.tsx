import type { DashboardStats } from '../lib/types';
import { Activity, Box, Package, Users, Loader2 } from 'lucide-react';

export function InventoryStatsGrid({
  stats,
  loading,
}: {
  stats: DashboardStats | null;
  loading: boolean;
}) {
  const statCards = [
    {
      label: 'Total Equipment',
      value: stats?.total_equipment ?? 0,
      icon: Package,
      color: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      label: 'Items Borrowed',
      value: stats?.items_borrowed ?? 0,
      icon: Activity,
      color: 'from-purple-500/20 to-pink-500/20',
    },
    {
      label: 'Active Users',
      value: stats?.active_users ?? 0,
      icon: Users,
      color: 'from-orange-500/20 to-amber-500/20',
    },
    {
      label: 'Low Stock Items',
      value: stats?.low_stock_items ?? 0,
      icon: Box,
      color: 'from-rose-500/20 to-red-500/20',
    },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-6">
      {statCards.map((stat, i) => (
        <div
          key={i}
          className="relative p-6 rounded-2xl bg-card border border-border overflow-hidden group hover:border-indigo-500/50 transition-colors"
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br opacity-50 ${stat.color} translate-y-[2px]`}
          />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-background rounded-xl border border-border text-foreground">
                <stat.icon className="w-5 h-5" />
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            <h3 className="text-4xl font-bold font-heading tracking-tight mb-1">
              {loading ? '...' : stat.value}
            </h3>
            <p className="text-muted-foreground font-medium">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

