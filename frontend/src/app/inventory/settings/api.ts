import { api, buildQueryString } from '@/lib/api';

import type { SettingsListParams, SystemSetting, SystemSettingCreate } from './lib/types';

export type { SettingsListParams, SystemSetting, SystemSettingCreate } from './lib/types';

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
