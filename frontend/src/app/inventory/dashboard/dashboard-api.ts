import { api } from '@/lib/api';

export interface DashboardStats {
  total_equipment: number;
  items_borrowed: number;
  active_users: number;
  low_stock_items: number;
}

export interface RecentTransaction {
  request_id: string;
  borrower_user_id?: string;
  items: Array<{
    item_id: string;
    qty_requested: number;
  }>;
  status: string;
  request_date: string;
}

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/inventory/dashboard/stats'),
  getRecent: () => api.get<RecentTransaction[]>('/inventory/dashboard/recent'),
};
