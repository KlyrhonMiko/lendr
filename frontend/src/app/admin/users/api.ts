import { api, buildQueryString } from '@/lib/api';

export interface User {
  user_id: string; // Display ID (e.g. USER-XXXXXX)
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  contact_number?: string;
  employee_id?: string;
  role: string;
  shift_type: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  contact_number?: string;
  employee_id?: string;
  role: string;
  shift_type: string;
}

export type UserUpdate = Partial<UserCreate>;

export interface UserListParams {
  page?: number;
  per_page?: number;
  search?: string;
  role?: string;
  shift_type?: string;
  is_active?: boolean;
}

export interface AuthConfig {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
}

export interface UserTwoFactorStatus {
  enabled: boolean;
  method: string;
  enrolled_at: string | null;
}

export interface UserTwoFactorEnrollmentInitiateResponse {
  method: string;
  secret: string;
  provisioning_uri: string;
}

export interface SecurityPasswordRules {
  min_length: number;
}

export interface SecuritySettingsSummary {
  password_rules: SecurityPasswordRules;
}

export const userApi = {
  list: (params: UserListParams = {}) =>
    api.get<User[]>(`/admin/users${buildQueryString(params as Record<string, unknown>)}`),

  get: (userId: string) =>
    api.get<User>(`/admin/users/${userId}`),

  register: (data: UserCreate) =>
    api.post<User>('/admin/users/register', data),

  update: (userId: string, data: UserUpdate) =>
    api.patch<User>(`/admin/users/${userId}`, data),

  delete: (userId: string) =>
    api.delete<User>(`/admin/users/${userId}`),

  restore: (userId: string) =>
    api.post<User>(`/admin/users/${userId}/restore`),

  resetTwoFactor: (userId: string) =>
    api.post<UserTwoFactorStatus>(`/admin/users/${userId}/2fa/reset`),

  getTwoFactorStatus: (userId: string) =>
    api.get<UserTwoFactorStatus>(`/admin/users/${userId}/2fa/status`),

  initiateTwoFactorEnrollment: (userId: string) =>
    api.post<UserTwoFactorEnrollmentInitiateResponse>(`/admin/users/${userId}/2fa/enroll/initiate`),

  verifyTwoFactorEnrollment: (userId: string, code: string) =>
    api.post<UserTwoFactorStatus>(`/admin/users/${userId}/2fa/enroll/verify`, { code }),

  getConfigs: (category: string) =>
    api.get<AuthConfig[]>(`/auth/config?category=${category}`),

  getSecuritySettings: () =>
    api.get<SecuritySettingsSummary>('/admin/settings/security'),
};
