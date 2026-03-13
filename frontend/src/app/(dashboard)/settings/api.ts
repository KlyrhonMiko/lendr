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
  list: () => api.get<SystemSetting[]>('/config'),
  
  create: (data: SystemSettingCreate) => api.post<SystemSetting>('/config', data),
  
  update: (key: string, value: string) => api.patch<SystemSetting>(`/config/${key}`, { value }),
};
