import { AdminStats } from '../lib/types';
import { Users, ShieldCheck, Database, Activity } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  iconBg: string;
  loading: boolean;
  subtitle?: string;
}

function StatCard({ label, value, icon: Icon, accent, iconBg, loading, subtitle }: StatCardProps) {
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
          <div className="flex flex-col">
            <p className="text-2xl font-bold font-heading tracking-tight leading-none mt-0.5">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-1 truncate">{subtitle}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminStatsGrid({ stats, loading }: { stats: AdminStats | null; loading: boolean }) {
  const cards = [
    {
      label: 'Active Users',
      value: stats?.total_users ?? 0,
      icon: Users,
      accent: 'text-yellow-600 dark:text-yellow-400',
      iconBg: 'bg-yellow-100/50 dark:bg-yellow-500/10',
    },
    {
      label: 'Current Sessions',
      value: stats?.active_sessions ?? 0,
      icon: Activity,
      accent: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'Audit Log (24h)',
      value: stats?.audit_log_count_24h ?? 0,
      icon: ShieldCheck,
      accent: 'text-yellow-600 dark:text-yellow-400',
      iconBg: 'bg-yellow-100/50 dark:bg-yellow-500/10',
    },
    {
      label: 'System Backup',
      value: stats?.last_backup_status?.toUpperCase() ?? 'NONE',
      icon: Database,
      accent: stats?.last_backup_status === 'completed' ? 'text-emerald-600' : 'text-amber-600',
      iconBg: stats?.last_backup_status === 'completed' ? 'bg-emerald-50' : 'bg-amber-50',
      subtitle: stats?.last_backup_time ?? 'No backup recorded',
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
