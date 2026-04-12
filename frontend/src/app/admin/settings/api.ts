import { api, buildQueryString } from '@/lib/api';
import type { JsonValue } from '@/lib/types/json';
export { api, buildQueryString };

export interface SystemSetting {
  key: string;
  value: string;
  category: string;
  system: string;
  description: string | null;
  crucial: boolean;
  last_modified?: string;
}

export interface SystemSettingCreate {
  key: string;
  value: string;
  category?: string;
  system?: string;
  description?: string;
}

export interface SettingsListParams {
  page?: number;
  per_page?: number;
  search?: string;
  category?: string;
  system?: string;
}

export type ActiveTab = 'general' | 'operations' | 'health' | 'security' | 'dictionary';

export const settingsApi = {
  list: (params: SettingsListParams = {}) =>
    api.get<SystemSetting[]>(`/admin/config${buildQueryString(params as Record<string, unknown>)}`),

  create: (data: SystemSettingCreate) => api.post<SystemSetting>('/admin/config', data),

  update: (key: string, value: string, category = 'general') =>
    api.patch<SystemSetting>(
      `/admin/config/${encodeURIComponent(key)}?category=${encodeURIComponent(category)}`,
      { value }
    ),

  // Auth Config
  listAuth: (params: SettingsListParams = {}) =>
    api.get<SystemSetting[]>(`/auth/config${buildQueryString(params as Record<string, unknown>)}`),

  createAuth: (data: SystemSettingCreate) => api.post<SystemSetting>('/auth/config', data),

  // Categories, Systems and Tables
  listCategories: () => api.get<string[]>('/admin/config/categories'),
  listSystems: () => api.get<string[]>('/admin/config/systems'),
  listTables: () => api.get<string[]>('/admin/config/tables'),
  listTableColumns: (tableName: string) => api.get<string[]>(`/admin/config/tables/${tableName}/columns`),
  restore: (key: string, category = 'general') =>
    api.post<SystemSetting>(`/admin/config/${encodeURIComponent(key)}/restore?category=${encodeURIComponent(category)}`, {}),

  delete: (key: string, category = 'general') =>
    api.delete<SystemSetting>(`/admin/config/${encodeURIComponent(key)}?category=${encodeURIComponent(category)}`),
};

// --- System Health API ---

export interface HealthStatus {
  registry_status: string;
  database_health: string;
  uptime_formatted: string;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  active_db_connections: number;
}

export interface StorageBreakdown {
  database: number;
  logs: number;
  attachments: number;
  backups: number;
  other: number;
}

export interface HealthStorage {
  total_space_bytes: number;
  used_space_bytes: number;
  free_space_bytes: number;
  breakdown: StorageBreakdown;
}

export interface HealthUser {
  id: string;
  username: string;
  full_name: string | null;
  role_name: string | null;
}

export interface HealthSession {
  session_id: string;
  user: HealthUser | null;
  issued_at: string;
  expires_at: string;
  device_id: string | null;
}

export interface HealthLog {
  timestamp: string;
  code: string;
  message: string;
  level: string;
  severity: 'Critical' | 'Warning' | 'Info';
}

export interface GeneralSettingsData {
  localization: {
    timezone: string;
    date_format: string;
    time_format: string;
    language: string;
  };
}

export interface BrandingSettingsData {
  visual_identity: {
    brand_name: string;
    system_theme: string;
    logo_url: string | null;
    favicon_url: string | null;
  };
}

export interface OperationsSettingsData {
  maintenance: {
    enabled: boolean;
    message: string;
  };
  backup_schedule: {
    frequency: string;
    time: string;
    storage_location: string;
  };
  archive_policy: {
    audit_logs_value: number;
    audit_logs_unit: string;
    borrow_records_value: number;
    borrow_records_unit: string;
  };
  retention_policy: {
    auto_delete: boolean;
    delete_older_than_value: number;
    delete_older_than_unit: string;
    exclusion_list: string[];
    maintenance_time: string;
  };
}

export interface SecurityTwoFactorSettings {
  enabled: boolean;
  method: 'authenticator_app';
  enforce_for_roles: string[];
  enforce_on: 'next_login';
}

export interface SecurityPasswordRulesSettings {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_number: boolean;
  require_special: boolean;
  applies_when_role_not_in: string[];
}

export interface SecuritySessionTimeoutSettings {
  inactive_minutes: number;
  warning_minutes: number;
}

export interface SecurityRbacOverviewSettings {
  policy_source: 'rbac_roles';
  last_updated_at: string | null;
  role_definitions: SecurityRbacRoleDefinition[];
}

export interface SecurityRbacRoleDefinition {
  role: string;
  display_name: string;
  systems: string[];
  permissions: string[];
  user_count: number;
}

export interface SecurityShiftDefinition {
  key: string;
  label: string;
  start: string;
  end: string;
  days: number[];
}

export interface SecurityShiftDefinitionsSettings {
  source_category: 'users_shift_type';
  values: string[];
  definitions: SecurityShiftDefinition[];
}

export interface SecuritySettingsData {
  two_factor: SecurityTwoFactorSettings;
  password_rules: SecurityPasswordRulesSettings;
  session_timeout: SecuritySessionTimeoutSettings;
  rbac_overview: SecurityRbacOverviewSettings;
  shift_definitions: SecurityShiftDefinitionsSettings;
}

export interface DashboardRoleDistribution {
  role: string;
  count: number;
}

export interface DashboardUserInsights {
  distribution: DashboardRoleDistribution[];
  trends: Array<{ date: string; count: number }>;
}

export const healthApi = {
  getStatus: () => api.get<HealthStatus>('/admin/health/status'),
  getStorage: () => api.get<HealthStorage>('/admin/health/storage'),
  getSessions: () => api.get<HealthSession[]>('/admin/health/sessions'),
  terminateSession: (sessionId: string) => api.delete(`/admin/health/sessions/${sessionId}`),
  getLogs: (params: { page?: number; per_page?: number } = {}) =>
    api.get<HealthLog[]>(`/admin/health/logs${buildQueryString(params as Record<string, unknown>)}`),
};

export const securitySettingsApi = {
  get: () => api.get<SecuritySettingsData>('/admin/settings/security'),
  update: (payload: SecuritySettingsData) => api.put<SecuritySettingsData>('/admin/settings/security', payload),
  getUserInsights: () => api.get<DashboardUserInsights>('/admin/dashboard/users'),
};

// --- Archives API ---
import type { BorrowRequest } from '../../inventory/requests/api';

export interface ArchivedAuditLog {
  id: string;
  audit_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  reason_code: string | null;
  before_json: JsonValue;
  after_json: JsonValue;
  user_id: string | null;
  employee_id: string | null;
  created_at: string;
  is_archived: boolean;
  archived_at: string;
  retention_tags: string[] | null;
}

export interface ArchivedBorrowRequest extends BorrowRequest {
  id: string;
  is_archived: boolean;
  archived_at: string;
  retention_tags: string[] | null;
}

export const archivesApi = {
  getAuditLogs: (params: { page?: number; per_page?: number } = {}) =>
    api.get<ArchivedAuditLog[]>(`/admin/settings/operations/archives/audit-logs${buildQueryString(params as Record<string, unknown>)}`),

  getBorrowRequests: (params: { page?: number; per_page?: number } = {}) =>
    api.get<ArchivedBorrowRequest[]>(`/admin/settings/operations/archives/borrow-requests${buildQueryString(params as Record<string, unknown>)}`),

  restore: (entityType: 'audit-log' | 'borrow-request', id: string) =>
    api.post(`/admin/settings/operations/archives/${entityType}/${id}/restore`),

  updateTags: (entityType: 'audit-log' | 'borrow-request', id: string, tags: string[]) =>
    api.patch(`/admin/settings/operations/archives/${entityType}/${id}/tags`, { tags }),
};
