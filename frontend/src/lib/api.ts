'use client';

import {
  http,
  HttpRequestError,
  MaintenanceError,
  getDeviceId,
  ApiResponse,
  PaginationMeta,
} from './http';

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

interface BootstrapRotatePasswordPayload {
  username: string;
  current_password: string;
  new_password: string;
}

interface ErrorPayload {
  message?: string;
  detail?: string;
}

interface AuthTokenResponse {
  access_token: string;
  token_type: string;
}

export class AuthApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

function resolveAuthErrorMessage(payload: ErrorPayload, fallback: string): string {
  return payload.message || payload.detail || fallback;
}

function toAuthApiError(error: unknown, fallback: string): AuthApiError {
  if (error instanceof AuthApiError) {
    return error;
  }

  if (error instanceof HttpRequestError) {
    return new AuthApiError(
      error.status,
      resolveAuthErrorMessage(error.payload, fallback),
    );
  }

  if (error instanceof Error) {
    return new AuthApiError(500, error.message || fallback);
  }

  return new AuthApiError(500, fallback);
}

export const api = {
  getDeviceId,

  login: async (formData: LoginCredentials) => {
    const body = new FormData();
    body.append('username', formData.username);
    body.append('password', formData.password);

    try {
      return await http.request<AuthTokenResponse>('/auth/login', {
        method: 'POST',
        body,
      });
    } catch (error: unknown) {
      throw toAuthApiError(error, 'Invalid username or password');
    }
  },

  rotateBootstrapPassword: async (payload: BootstrapRotatePasswordPayload) => {
    try {
      return await http.request('/auth/bootstrap/rotate-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (error: unknown) {
      throw toAuthApiError(error, 'Failed to rotate bootstrap password');
    }
  },

  borrowerLogin: async (formData: LoginCredentials) => {
    const body = new FormData();
    body.append('username', formData.username);
    body.append('password', formData.password);

    try {
      return await http.request<AuthTokenResponse>('/auth/borrower/login', {
        method: 'POST',
        body,
      });
    } catch (error: unknown) {
      throw toAuthApiError(error, 'Invalid borrower pin');
    }
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
