import { api } from '@/lib/api';

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

export const settingsApi = {
  list: () => api.get<SystemSetting[]>('/admin/config'),
  
  create: (data: SystemSettingCreate) => api.post<SystemSetting>('/admin/config', data),
  
  update: (key: string, value: string) => api.patch<SystemSetting>(`/admin/config/${key}`, { value }),
};
