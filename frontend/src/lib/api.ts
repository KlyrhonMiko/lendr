'use client';

import { http, MaintenanceError, getDeviceId, ApiResponse, PaginationMeta } from './http';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export { MaintenanceError };
export type { ApiResponse, PaginationMeta };

/** Build a URL query string from a plain object, omitting null/undefined/empty values. */
export function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

interface LoginCredentials {
  username: string;
  password: string;
}

export const api = {
  getDeviceId,

  login: async (formData: LoginCredentials) => {
    const body = new FormData();
    body.append('username', formData.username);
    body.append('password', formData.password);

    const deviceId = await getDeviceId();

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      body,
      headers: {
        'X-Device-ID': deviceId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Invalid username or password');
    }

    return response.json();
  },

  borrowerLogin: async (formData: LoginCredentials) => {
    const body = new FormData();
    body.append('username', formData.username);
    body.append('password', formData.password);

    const deviceId = await getDeviceId();

    const response = await fetch(`${API_BASE_URL}/api/auth/borrower/login`, {
      method: 'POST',
      body,
      headers: {
        'X-Device-ID': deviceId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || 'Invalid borrower pin');
    }

    return response.json();
  },

  borrowerVerifyPin: async (formData: LoginCredentials) => {
    const body = new FormData();
    body.append('username', formData.username);
    body.append('password', formData.password);

    const response = await fetch(`${API_BASE_URL}/api/auth/borrower/verify-pin`, {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || 'Invalid borrower pin');
    }

    return response.json();
  },

  get: <T>(url: string) => http.request<T>(url, { method: 'GET' }),

  post: <T>(url: string, data?: unknown) => {
    const options: RequestInit = { method: 'POST' };
    if (data !== undefined) {
      options.body = data instanceof FormData ? data : JSON.stringify(data);
    }
    return http.request<T>(url, options);
  },

  patch: <T>(url: string, data: unknown) =>
    http.request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  put: <T>(url: string, data: unknown) =>
    http.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: <T>(url: string) => http.request<T>(url, { method: 'DELETE' }),
};
