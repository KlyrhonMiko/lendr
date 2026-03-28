import { api, buildQueryString } from '@/lib/api';

export interface SystemSetting {
  key: string;
  value: string;
  category: string;
  description: string | null;
  last_modified?: string;
}

export interface SystemSettingCreate {
  key: string;
  value: string;
  category?: string;
  description?: string;
}

export interface SettingsListParams {
  page?: number;
  per_page?: number;
  search?: string;
  category?: string;
}

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

  // Categories and Tables
  listCategories: () => api.get<string[]>('/admin/config/categories'),
  listTables: () => api.get<string[]>('/admin/config/tables'),
  listTableColumns: (tableName: string) => api.get<string[]>(`/admin/config/tables/${tableName}/columns`),
  restore: (key: string, category = 'general') => 
    api.post<SystemSetting>(`/admin/config/${encodeURIComponent(key)}/restore?category=${encodeURIComponent(category)}`, {}),

  delete: (key: string, category = 'general') =>
    api.delete<SystemSetting>(`/admin/config/${encodeURIComponent(key)}?category=${encodeURIComponent(category)}`),
};
