'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { dashboardApi } from './dashboard-api';
import type {
  DashboardStats,
  RecentTransaction,
  LowStockItem,
  PendingCounts,
  CategoryBreakdown,
  InventoryHealth,
  BorrowingTrend,
} from './lib/types';
import { DashboardHeader } from './components/DashboardHeader';
import { InventoryStatsGrid } from './components/InventoryStatsGrid';
import { RecentTransactionsPanel } from './components/RecentTransactionsPanel';
import { QuickActionsPanel } from './components/QuickActionsPanel';
import { LowStockPanel } from './components/LowStockPanel';
import { RequestsPipelinePanel } from './components/RequestsPipelinePanel';
import { InventoryBreakdownPanel } from './components/InventoryBreakdownPanel';
import { InventoryHealthPanel, BorrowingTrendsPanel } from './components/ActivityCharts';

export default function InventoryDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentTransaction[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({});
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
  const [health, setHealth] = useState<InventoryHealth | null>(null);
  const [trends, setTrends] = useState<BorrowingTrend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, recentRes, lowStockRes, pendingRes, breakdownRes, healthRes, trendsRes] =
        await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getRecent(),
          dashboardApi.getLowStock(),
          dashboardApi.getPendingCounts(),
          dashboardApi.getInventoryBreakdown(),
          dashboardApi.getHealth(),
          dashboardApi.getTrends(),
        ]);
      setStats(statsRes.data);
      setRecent(recentRes.data);
      setLowStock(lowStockRes.data);
      setPendingCounts(pendingRes.data);
      setBreakdown(breakdownRes.data);
      setHealth(healthRes.data);
      setTrends(trendsRes.data);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 animate-in fade-in duration-500">
      <DashboardHeader />

      <InventoryStatsGrid stats={stats} loading={loading} />
      
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <BorrowingTrendsPanel trends={trends} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          <InventoryHealthPanel health={health} loading={loading} />
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 min-h-0">
          <RecentTransactionsPanel recent={recent} loading={loading} />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          <RequestsPipelinePanel counts={pendingCounts} loading={loading} />
          <QuickActionsPanel />
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-3">
          <LowStockPanel items={lowStock} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          <InventoryBreakdownPanel breakdown={breakdown} loading={loading} />
        </div>
      </div>
    </div>
  );
}
