import { api } from '@/lib/api';

export interface Borrower {
  user_id: string;
  username: string;
  email: string;
}

export interface BatchItem {
  item_id: string;
  qty_requested: number;
}

export interface BatchBorrowRequest {
  borrower_id: string;
  items: BatchItem[];
  notes?: string;
  due_at?: string;
  team_name?: string;
  involved_people?: Record<string, unknown>[];
  store_name?: string;
  location_name?: string;
  is_emergency?: boolean;
  compliance_followup_required?: boolean;
  compliance_followup_notes?: string;
}

export const posApi = {
  // Fetch users for the "Ordering For" selection
  getBorrowers: async () => {
    return api.get<Borrower[]>('/admin/users');
  },

  // Submit batch borrow requests
  createBatchBorrow: async (data: BatchBorrowRequest) => {
    return api.post<any>('/inventory/borrowing/batch', data);
  }
};
