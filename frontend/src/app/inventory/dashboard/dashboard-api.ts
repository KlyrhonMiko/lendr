import { api } from '@/lib/api';

import type {
  DashboardStats,
  RecentTransaction,
  LowStockItem,
  PendingCounts,
  CategoryBreakdown,
} from './lib/types';

export type {
  DashboardStats,
  RecentTransaction,
  LowStockItem,
  PendingCounts,
  CategoryBreakdown,
} from './lib/types';

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/inventory/dashboard/stats'),
  getRecent: () => api.get<RecentTransaction[]>('/inventory/dashboard/recent'),
  getLowStock: () => api.get<LowStockItem[]>('/inventory/dashboard/low-stock'),
  getPendingCounts: () => api.get<PendingCounts>('/inventory/dashboard/pending-counts'),
  getInventoryBreakdown: () => api.get<CategoryBreakdown[]>('/inventory/dashboard/inventory-breakdown'),
};
