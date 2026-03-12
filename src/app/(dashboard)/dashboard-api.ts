import { api } from '@/lib/api';

export interface DashboardStats {
  total_equipment: number;
  items_borrowed: number;
  active_users: number;
  low_stock_items: number;
}

export interface RecentTransaction {
  borrow_id: string;
  item_id: string;
  borrower_id: string;
  qty_requested: number;
  status: string;
  request_date: string;
}

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats'),
  getRecent: () => api.get<RecentTransaction[]>('/dashboard/recent'),
};
