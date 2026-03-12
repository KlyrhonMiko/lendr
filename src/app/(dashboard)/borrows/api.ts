import { api } from '@/lib/api';

export interface BorrowRequest {
  borrow_id: string;
  item_id: string;
  borrower_id: string;
  qty_requested: number;
  status: string;
  notes?: string;
  request_date: string;
  approved_at?: string;
  released_at?: string;
  returned_at?: string;
}

export interface BorrowRequestCreate {
  item_id: string;
  qty_requested: number;
  notes?: string;
  borrower_id?: string;
}

export const borrowApi = {
  list: () => api.get<BorrowRequest[]>('/borrowing/requests'),
  
  create: (data: BorrowRequestCreate) => api.post<BorrowRequest>('/borrowing/requests', data),
  
  approve: (id: string) => api.post<BorrowRequest>(`/borrowing/requests/${id}/approve`, {}),
  
  release: (id: string) => api.post<BorrowRequest>(`/borrowing/requests/${id}/release`, {}),
  
  return: (id: string) => api.post<BorrowRequest>(`/borrowing/requests/${id}/return`, {}),
};
