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

export interface UserUpdate extends Partial<UserCreate> {}

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

  getConfigs: (category: string) =>
    api.get<AuthConfig[]>(`/auth/config?category=${category}`),
};
