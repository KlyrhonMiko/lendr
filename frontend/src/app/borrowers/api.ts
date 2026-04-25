import { api, buildQueryString } from '@/lib/api';
import { auth, User } from '@/lib/auth';

export interface BorrowerHistoryItem {
  item_id: string;
  name: string;
  qty_requested: number;
  classification?: string;
  item_type?: string;
  is_trackable?: boolean;
}

export interface BorrowerHistoryEvent {
  event_id: string;
  event_type: string;
  actor_user_id?: string;
  actor_name?: string;
  note?: string;
  occurred_at: string;
}

export interface BorrowerHistoryRequest {
  request_id: string;
  transaction_ref: string;
  status: string;
  request_date: string;
  borrower_user_id?: string;
  borrower_name?: string;
  request_channel: string;
  notes?: string;
  customer_name?: string;
  location_name?: string;
  return_at?: string;
  is_emergency: boolean;
  closed_at?: string;
  close_reason?: string;
  items: BorrowerHistoryItem[];
  events: BorrowerHistoryEvent[];
}

export interface BorrowerHistoryParams {
  page?: number;
  per_page?: number;
  status?: string;
  is_emergency?: boolean;
  date_from?: string;
  date_to?: string;
}

export type BorrowerAccountUpdatePayload = Partial<
  Pick<User, 'first_name' | 'last_name' | 'middle_name' | 'email' | 'contact_number'>
> & {
  password?: string;
  current_password?: string;
};

export const borrowersApi = {
  getHistory: (params: BorrowerHistoryParams = {}) =>
    api.get<BorrowerHistoryRequest[]>(
      `/inventory/borrower/requests${buildQueryString(params as Record<string, unknown>)}`
    ),

  updateAccount: (data: BorrowerAccountUpdatePayload) => auth.updateMe(data),
};
