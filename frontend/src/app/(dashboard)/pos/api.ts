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
}

export const posApi = {
  // Fetch users for the "Ordering For" selection
  getBorrowers: async () => {
    return api.get<Borrower[]>('/users');
  },

  // Submit batch borrow requests
  createBatchBorrow: async (data: BatchBorrowRequest) => {
    return api.post<any>('/borrowing/batch', data);
  }
};
