import { api, buildQueryString } from '@/lib/api';

import type { Anomaly, LedgerMovement, MovementLedgerParams } from './lib/types';

export const ledgerApi = {
  list: (params: MovementLedgerParams = {}) =>
    api.get<LedgerMovement[]>(
      `/inventory/items/movements/ledger${buildQueryString(params as Record<string, unknown>)}`,
    ),

  getAnomalies: (params: { severity?: string; skip?: number; limit?: number } = {}) =>
    api.get<Anomaly[]>(`/inventory/items/movements/anomalies${buildQueryString(params as Record<string, unknown>)}`),

  reverse: (movementId: string, reason: string, reason_code?: string) =>
    api.post<any>(`/inventory/items/movements/${movementId}/reverse`, { reason, reason_code }),
};

export type { Anomaly, LedgerMovement, MovementLedgerParams };
