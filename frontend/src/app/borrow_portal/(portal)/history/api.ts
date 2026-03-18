import { api } from '@/lib/api';

export interface BorrowRequestEvent {
  event_id: string;
  event_type: string;
  actor_user_id?: string;
  note?: string;
  occurred_at: string; // Pre-formatted datetime string: MM/DD/YYYY - HH:MM:SS AM/PM
}

export interface BorrowerBorrowRequest {
  request_id: string;
  items: Array<{
    item_id: string;
    item_name?: string;
    qty_requested: number;
  }>;
  status: string;
  notes?: string;
  request_date: string; // Pre-formatted datetime string: MM/DD/YYYY - HH:MM:SS AM/PM
  events?: BorrowRequestEvent[];
}

export const borrowerHistoryApi = {
  // Get current borrower's own requests via the borrower portal endpoint
  getMyRequests: () => api.get<BorrowerBorrowRequest[]>('/inventory/borrower/requests')
};
