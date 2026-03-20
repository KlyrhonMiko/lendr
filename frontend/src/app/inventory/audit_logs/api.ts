import { api, buildQueryString } from '@/lib/api';

import type { AuditLog, AuditLogParams } from './lib/types';

export type { AuditLog, AuditLogParams } from './lib/types';

export const inventoryAuditApi = {
  list: (params: AuditLogParams = {}) =>
    api.get<AuditLog[]>(`/inventory/audit-log/logs${buildQueryString(params as Record<string, unknown>)}`),
};
