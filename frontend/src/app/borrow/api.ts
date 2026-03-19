import { api } from '@/lib/api';

interface CreateBatchBorrowPayload {
  items: {
    item_id: string;
    qty_requested: number;
  }[];
  notes: string;
  customer_name: string;
  location_name: string;
}

export const posApi = {
  // Submit multi-item borrow request through public borrower flow
  createBatchBorrow: (data: CreateBatchBorrowPayload) =>
    api.post('/inventory/borrower/requests', data),
};

