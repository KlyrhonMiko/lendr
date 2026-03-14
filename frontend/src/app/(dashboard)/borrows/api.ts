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
  due_at?: string;
  team_name?: string;
  involved_people?: Record<string, unknown>[];
  store_name?: string;
  location_name?: string;
  is_emergency?: boolean;
  compliance_followup_required?: boolean;
  compliance_followup_notes?: string;
}

export interface BorrowActionPayload {
  notes?: string;
}

export const borrowApi = {
  list: () => api.get<BorrowRequest[]>('/inventory/borrowing/requests'),
  
  create: (data: BorrowRequestCreate) => api.post<BorrowRequest>('/inventory/borrowing/requests', data),
  
  approve: (id: string, payload: BorrowActionPayload = {}) =>
    api.post<BorrowRequest>(`/inventory/borrowing/requests/${id}/approve`, payload),
  
  release: (id: string, payload: BorrowActionPayload = {}) =>
    api.post<BorrowRequest>(`/inventory/borrowing/requests/${id}/release`, payload),
  
  return: (id: string, payload: BorrowActionPayload = {}) =>
    api.post<BorrowRequest>(`/inventory/borrowing/requests/${id}/return`, payload),
};
