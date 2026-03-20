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

export type SystemSettingFormData = SystemSettingCreate & {
  category: string;
  description: string;
};

