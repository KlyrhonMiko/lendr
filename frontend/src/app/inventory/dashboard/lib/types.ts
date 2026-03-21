export interface DashboardStats {
  total_equipment: number;
  items_borrowed: number;
  active_users: number;
  low_stock_items: number;
}

export interface RecentTransactionItem {
  item_id: string;
  name: string;
  qty_requested: number;
  classification?: string;
  item_type?: string;
}

export interface RecentTransaction {
  request_id: string;
  transaction_ref: string;
  borrower_user_id?: string;
  borrower_name?: string;
  customer_name?: string;
  location_name?: string;
  items: RecentTransactionItem[];
  status: string;
  request_date: string;
  is_emergency: boolean;
}

export interface LowStockItem {
  item_id: string;
  name: string;
  category: string | null;
  available_qty: number;
  total_qty: number;
}

export interface PendingCounts {
  [status: string]: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
}
