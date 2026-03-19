import { api } from '@/lib/api';

export interface BatchItem {
  item_id: string;
  qty_requested: number;
}

export interface BatchBorrowRequest {
  items: BatchItem[];
  notes?: string;
  return_at?: string;
  involved_people?: Record<string, unknown>[];
  is_emergency?: boolean;
  customer_name?: string;
  location_name?: string;
}

export const posApi = {
  // Submit multi-item borrow request through borrower portal flow
  createBatchBorrow: async (data: BatchBorrowRequest) => {
    return api.post('/inventory/borrower/requests', data);
  }
};
