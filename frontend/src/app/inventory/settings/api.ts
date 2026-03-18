import { api, buildQueryString } from '@/lib/api';

export interface SystemSetting {
  key: string;
  value: string;
  category: string;
  description: string | null;
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
  key?: string;
  category?: string;
}

export const inventorySettingsApi = {
  // Inventory Config
  listInventory: (params: SettingsListParams = {}) =>
    api.get<SystemSetting[]>(`/inventory/config/inventory${buildQueryString(params as Record<string, unknown>)}`),

  createInventory: (data: SystemSettingCreate) => 
    api.post<SystemSetting>('/inventory/config/inventory', data),

  // Borrower Config
  listBorrower: (params: SettingsListParams = {}) =>
    api.get<SystemSetting[]>(`/inventory/config/borrower${buildQueryString(params as Record<string, unknown>)}`),

  createBorrower: (data: SystemSettingCreate) => 
    api.post<SystemSetting>('/inventory/config/borrower', data),
};
