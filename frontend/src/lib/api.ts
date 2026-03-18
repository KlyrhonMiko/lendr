import { auth } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  page?: number;
  per_page?: number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

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

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = auth.getToken();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}/api${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 401) {
      auth.logout();
    }

    throw new Error(errorData.message || errorData.detail || 'An error occurred during the request');
  }

  return response.json();
}

export const api = {
  login: async (formData: LoginCredentials) => {
    // Backend login expects multipart/form-data for OAuth2PasswordRequestForm
    const body = new FormData();
    body.append('username', formData.username);
    body.append('password', formData.password);

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      body,
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

    const response = await fetch(`${API_BASE_URL}/api/auth/borrower/login`, {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Invalid borrower pin');
    }

    return response.json();
  },

  get: <T>(url: string) => request<T>(url, { method: 'GET' }),

  post: <T>(url: string, data?: unknown) => {
    const options: RequestInit = { method: 'POST' };
    if (data !== undefined) {
      options.body = JSON.stringify(data);
    }
    return request<T>(url, options);
  },

  patch: <T>(url: string, data: unknown) =>
    request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
