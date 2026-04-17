import { api, buildQueryString } from '@/lib/api';

export interface BorrowerRequestHistoryItem {
  item_id: string;
  name: string;
  qty_requested: number;
  classification?: string;
  item_type?: string;
}

export interface BorrowerRequestHistoryEvent {
  event_id: string;
  event_type: string;
  actor_user_id?: string;
  actor_name?: string;
  note?: string;
  occurred_at: string;
}

export interface BorrowerRequestHistoryRecord {
  request_id: string;
  transaction_ref: string;
  status: string;
  request_date: string;
  return_at?: string | null;
  closed_at?: string | null;
  close_reason?: string | null;
  notes?: string | null;
  customer_name?: string | null;
  location_name?: string | null;
  is_emergency?: boolean;
  items: BorrowerRequestHistoryItem[];
  events: BorrowerRequestHistoryEvent[];
}

export interface BorrowerRequestHistoryParams {
  page?: number;
  per_page?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export const borrowerApi = {
  listRequestHistory: (params: BorrowerRequestHistoryParams = {}) =>
    api.get<BorrowerRequestHistoryRecord[]>(
      `/inventory/borrower/requests${buildQueryString(params as Record<string, unknown>)}`,
    ),
};
