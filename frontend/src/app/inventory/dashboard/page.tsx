'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useDashboardData } from './lib/useDashboardQueries';
import { DashboardHeader } from './components/DashboardHeader';
import { InventoryStatsGrid } from './components/InventoryStatsGrid';
import { RecentTransactionsPanel } from './components/RecentTransactionsPanel';
import { QuickActionsPanel } from './components/QuickActionsPanel';
import { LowStockPanel } from './components/LowStockPanel';
import { RequestsPipelinePanel } from './components/RequestsPipelinePanel';
import { InventoryBreakdownPanel } from './components/InventoryBreakdownPanel';
import { InventoryHealthPanel, BorrowingTrendsPanel } from './components/ActivityCharts';

export default function InventoryDashboard() {
  const {
    stats,
    recent,
    lowStock,
    pendingCounts,
    breakdown,
    health,
    trends,
    isLoading,
    isError,
  } = useDashboardData();

  useEffect(() => {
    if (isError) {
      toast.error('Failed to load dashboard data');
    }
  }, [isError]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 animate-in fade-in duration-500">
      <DashboardHeader />

      <InventoryStatsGrid stats={stats} loading={isLoading} />
      
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <BorrowingTrendsPanel trends={trends} loading={isLoading} />
        </div>
        <div className="lg:col-span-2">
          <InventoryHealthPanel health={health} loading={isLoading} />
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 min-h-0">
          <RecentTransactionsPanel recent={recent} loading={isLoading} />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          <RequestsPipelinePanel counts={pendingCounts} loading={isLoading} />
          <QuickActionsPanel />
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-3">
          <LowStockPanel items={lowStock} loading={isLoading} />
        </div>
        <div className="lg:col-span-2">
          <InventoryBreakdownPanel breakdown={breakdown} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}
