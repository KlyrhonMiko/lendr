'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { dashboardApi } from './dashboard-api';
import type { DashboardStats, RecentTransaction } from './lib/types';
import { DashboardHeader } from './components/DashboardHeader';
import { InventoryStatsGrid } from './components/InventoryStatsGrid';
import { RecentTransactionsPanel } from './components/RecentTransactionsPanel';
import { QuickActionsPanel } from './components/QuickActionsPanel';

export default function InventoryDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRecent()
      ]);
      setStats(statsRes.data);
      setRecent(recentRes.data);
    } catch {
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <DashboardHeader />
      <InventoryStatsGrid stats={stats} loading={loading} />

      <div className="grid md:grid-cols-3 gap-6">
        <RecentTransactionsPanel recent={recent} loading={loading} />
        <QuickActionsPanel />
      </div>
    </div>
  );
}
