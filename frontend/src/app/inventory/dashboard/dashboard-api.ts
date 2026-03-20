import { api } from '@/lib/api';

import type { DashboardStats, RecentTransaction } from './lib/types';

export type { DashboardStats, RecentTransaction } from './lib/types';

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/inventory/dashboard/stats'),
  getRecent: () => api.get<RecentTransaction[]>('/inventory/dashboard/recent'),
};
