import { api, buildQueryString } from '@/lib/api';
import type { JsonValue } from '@/lib/types/json';

export interface AuditLog {
  audit_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  reason_code?: string;
  user_id?: string;
  employee_id?: string;
  created_at: string;
  before_json?: Record<string, JsonValue>;
  after_json?: Record<string, JsonValue>;
}

export interface AuditLogParams {
  page?: number;
  per_page?: number;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  actor_id?: string;
  date_from?: string;
  date_to?: string;
}

export const adminAuditApi = {
  list: (params: AuditLogParams = {}) =>
    api.get<AuditLog[]>(`/admin/audit-log/logs${buildQueryString(params as Record<string, unknown>)}`),
};
