import { api, buildQueryString } from '@/lib/api';

export interface BorrowRequest {
  request_id: string;
  borrower_user_id?: string;
  items: Array<{
    item_id: string;
    qty_requested: number;
  }>;
  status: string;
  notes?: string;
  request_date: string;
  approved_at?: string;
  released_at?: string;
  returned_at?: string;
  is_emergency?: boolean;
  request_channel?: string;
}

export interface BorrowRequestCreate {
  items: Array<{
    item_id: string;
    qty_requested: number;
  }>;
  notes?: string;
  return_at?: string;
  involved_people?: Record<string, unknown>[];
  is_emergency?: boolean;
}

export interface BorrowActionPayload {
  notes?: string;
}

export interface BorrowListParams {
  page?: number;
  per_page?: number;
  status?: string;
  request_channel?: string;
  is_emergency?: boolean;
  borrower_id?: string;
  returned_on_time?: boolean;
  date_from?: string;
  date_to?: string;
}

export const borrowApi = {
  list: (params: BorrowListParams = {}) =>
    api.get<BorrowRequest[]>(`/inventory/borrowing/requests${buildQueryString(params as Record<string, unknown>)}`),

  create: (data: BorrowRequestCreate) => api.post<BorrowRequest>('/inventory/borrowing/requests', data),

  approve: (id: string, payload: BorrowActionPayload = {}) =>
    api.post<BorrowRequest>(`/inventory/borrowing/requests/${id}/approve`, payload),

  reject: (id: string, payload: BorrowActionPayload = {}) =>
    api.post<BorrowRequest>(`/inventory/borrowing/requests/${id}/reject`, payload),

  release: (id: string, payload: BorrowActionPayload = {}) =>
    api.post<BorrowRequest>(`/inventory/borrowing/requests/${id}/release`, payload),

  return: (id: string, payload: BorrowActionPayload = {}) =>
    api.post<BorrowRequest>(`/inventory/borrowing/requests/${id}/return`, payload),

  reopen: (id: string, payload: BorrowActionPayload = {}) =>
    api.post<BorrowRequest>(`/inventory/borrowing/requests/${id}/reopen`, payload),

  sendToWarehouse: (id: string, payload: BorrowActionPayload = {}) =>
    api.post<BorrowRequest>(`/inventory/borrowing/requests/${id}/send-to-warehouse`, payload),

  warehouseApprove: (id: string, payload: BorrowActionPayload = {}) =>
    api.post(`/inventory/borrowing/requests/${id}/warehouse-approve`, payload),

  warehouseReject: (id: string, remarks?: string) =>
    api.post<BorrowRequest>(
      `/inventory/borrowing/requests/${id}/warehouse-reject${remarks ? `?remarks=${encodeURIComponent(remarks)}` : ''}`
    ),
};
