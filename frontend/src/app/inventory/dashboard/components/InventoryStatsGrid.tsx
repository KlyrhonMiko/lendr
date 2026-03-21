import type { DashboardStats } from '../lib/types';
import { Package, ArrowRightLeft, Users, AlertTriangle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  iconBg: string;
  loading: boolean;
}

function StatCard({ label, value, icon: Icon, accent, iconBg, loading }: StatCardProps) {
  return (
    <div className="group relative flex items-center gap-4 p-5 rounded-xl bg-card border border-border hover:border-border/80 hover:shadow-sm transition-all">
      <div className={`shrink-0 flex items-center justify-center w-11 h-11 rounded-lg ${iconBg}`}>
        <Icon className={`w-5 h-5 ${accent}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground font-medium truncate">{label}</p>
        {loading ? (
          <div className="mt-1 h-7 w-12 rounded bg-muted animate-pulse" />
        ) : (
          <p className="text-2xl font-bold font-heading tracking-tight leading-none mt-0.5">
            {value.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

export function InventoryStatsGrid({
  stats,
  loading,
}: {
  stats: DashboardStats | null;
  loading: boolean;
}) {
  const cards: Omit<StatCardProps, 'loading'>[] = [
    {
      label: 'Total Equipment',
      value: stats?.total_equipment ?? 0,
      icon: Package,
      accent: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      label: 'Items Borrowed',
      value: stats?.items_borrowed ?? 0,
      icon: ArrowRightLeft,
      accent: 'text-violet-600 dark:text-violet-400',
      iconBg: 'bg-violet-50 dark:bg-violet-500/10',
    },
    {
      label: 'Active Borrowers',
      value: stats?.active_users ?? 0,
      icon: Users,
      accent: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'Low Stock Items',
      value: stats?.low_stock_items ?? 0,
      icon: AlertTriangle,
      accent: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} loading={loading} />
      ))}
    </div>
  );
}
