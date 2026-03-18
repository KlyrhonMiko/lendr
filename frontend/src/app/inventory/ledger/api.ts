import { api, buildQueryString } from '@/lib/api';

export interface MovementLedgerParams {
  page?: number;
  per_page?: number;
  movement_type?: string;
  inventory_id?: string;
  reason_code?: string;
  reference_id?: string;
  date_from?: string;
  date_to?: string;
}

export const ledgerApi = {
  list: (params: MovementLedgerParams = {}) =>
    api.get<any[]>(`/inventory/items/movements/ledger${buildQueryString(params as Record<string, unknown>)}`),

  getAnomalies: (params: { severity?: string; skip?: number; limit?: number } = {}) =>
    api.get<any[]>(`/inventory/items/movements/anomalies${buildQueryString(params as Record<string, unknown>)}`),

  reverse: (movementId: string, reason: string, reason_code?: string) =>
    api.post<any>(`/inventory/items/movements/${movementId}/reverse`, { reason, reason_code }),
};
