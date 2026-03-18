import { api, buildQueryString } from '@/lib/api';

export interface AuditLog {
  audit_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  reason_code?: string;
  user_id?: string;
  employee_id?: string;
  created_at: string;
}

export interface AuditLogParams {
  page?: number;
  per_page?: number;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  actor_id?: string;
}

export const inventoryAuditApi = {
  list: (params: AuditLogParams = {}) =>
    api.get<AuditLog[]>(`/inventory/audit-log/logs${buildQueryString(params as Record<string, unknown>)}`),
};
