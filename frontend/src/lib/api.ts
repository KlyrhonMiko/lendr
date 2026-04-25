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

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface FirstLoginRotatePasswordPayload {
  username: string;
  current_password: string;
  new_password: string;
}

interface ErrorPayload {
  message?: string;
  detail?: string;
  code?: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
}

export interface TwoFactorChallengeResponse {
  two_factor_required: true;
  challenge_token: string;
  challenge_expires_at: string;
  method: string;
}

export interface FirstLoginPasswordChangeRequiredResponse {
  auth_state: 'password_change_required';
  code: 'AUTH.FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED' | string;
  password_change_required: true;
  rotation_endpoint: string;
  legacy_rotation_endpoint?: string | null;
}

export type LoginResponse =
  | AuthTokenResponse
  | TwoFactorChallengeResponse
  | FirstLoginPasswordChangeRequiredResponse;

export interface TwoFactorEnrollmentInitiateResponse {
  method: string;
  secret: string;
  provisioning_uri: string;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  method: string;
  enrolled_at: string | null;
}

const DEFAULT_FIRST_LOGIN_ROTATION_ENDPOINT = '/auth/first-login/rotate-password';

export class AuthApiError extends Error {
  status: number;
  code: string | null;

  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
  }
}

function resolveAuthErrorMessage(payload: ErrorPayload, fallback: string): string {
  return payload.message || payload.detail || fallback;
}

function hasEnvelopeShape<T>(payload: ApiResponse<T> | T): payload is ApiResponse<T> {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'status' in payload &&
    'data' in payload
  );
}

function unwrapAuthPayload<T>(payload: ApiResponse<T> | T): T {
  if (hasEnvelopeShape(payload)) {
    return payload.data;
  }
  return payload;
}

function normalizeAuthEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    return DEFAULT_FIRST_LOGIN_ROTATION_ENDPOINT;
  }

  let candidate = trimmed;

  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    try {
      candidate = new URL(candidate).pathname;
    } catch {
      return DEFAULT_FIRST_LOGIN_ROTATION_ENDPOINT;
    }
  }

  const normalizedPath = candidate.startsWith('/') ? candidate : `/${candidate}`;

  if (normalizedPath === '/api') {
    return '/';
  }
  if (normalizedPath.startsWith('/api/')) {
    return normalizedPath.slice(4);
  }

  return normalizedPath;
}

function toAuthApiError(error: unknown, fallback: string): AuthApiError {
  if (error instanceof AuthApiError) {
    return error;
  }

  if (error instanceof HttpRequestError) {
    return new AuthApiError(
      error.status,
      resolveAuthErrorMessage(error.payload, fallback),
      error.payload.code ?? null,
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
      const response = await http.request<LoginResponse>('/auth/login', {
        method: 'POST',
        body,
      });
      return unwrapAuthPayload(response as ApiResponse<LoginResponse> | LoginResponse);
    } catch (error: unknown) {
      throw toAuthApiError(error, 'Invalid username or password');
    }
  },

  verifyLoginTwoFactor: async (challenge_token: string, code: string) => {
    try {
      const response = await http.request<AuthTokenResponse>('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ challenge_token, code }),
      });
      return unwrapAuthPayload(response as ApiResponse<AuthTokenResponse> | AuthTokenResponse);
    } catch (error: unknown) {
      throw toAuthApiError(error, 'Failed to verify two-factor authentication code');
    }
  },

  initiateTwoFactorEnrollment: async () => {
    try {
      const response = await http.request<TwoFactorEnrollmentInitiateResponse>('/auth/2fa/enroll/initiate', {
        method: 'POST',
      });
      return unwrapAuthPayload(
        response as
        | ApiResponse<TwoFactorEnrollmentInitiateResponse>
        | TwoFactorEnrollmentInitiateResponse,
      );
    } catch (error: unknown) {
      throw toAuthApiError(error, 'Unable to initiate two-factor enrollment');
    }
  },

  verifyTwoFactorEnrollment: async (code: string) => {
    try {
      const response = await http.request<TwoFactorStatusResponse>('/auth/2fa/enroll/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      return unwrapAuthPayload(response as ApiResponse<TwoFactorStatusResponse> | TwoFactorStatusResponse);
    } catch (error: unknown) {
      throw toAuthApiError(error, 'Failed to enable two-factor authentication');
    }
  },

  disableTwoFactorEnrollment: async (code: string) => {
    try {
      const response = await http.request<TwoFactorStatusResponse>('/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      return unwrapAuthPayload(response as ApiResponse<TwoFactorStatusResponse> | TwoFactorStatusResponse);
    } catch (error: unknown) {
      throw toAuthApiError(error, 'Failed to disable two-factor authentication');
    }
  },

  getTwoFactorStatus: async () => {
    try {
      const response = await http.request<TwoFactorStatusResponse>('/auth/2fa/status', {
        method: 'GET',
      });
      return unwrapAuthPayload(response as ApiResponse<TwoFactorStatusResponse> | TwoFactorStatusResponse);
    } catch (error: unknown) {
      throw toAuthApiError(error, 'Failed to load two-factor authentication status');
    }
  },

  rotateFirstLoginPassword: async (
    payload: FirstLoginRotatePasswordPayload,
    endpoint: string = DEFAULT_FIRST_LOGIN_ROTATION_ENDPOINT,
  ) => {
    const normalizedEndpoint = normalizeAuthEndpoint(endpoint);

    try {
      return await http.request(normalizedEndpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (error: unknown) {
      throw toAuthApiError(error, 'Failed to rotate first-login password');
    }
  },

  borrowerLogin: async (formData: LoginCredentials) => {
    // Keep compatibility for any legacy caller while enforcing the unified login flow.
    return api.login(formData);
  },

  get: <T>(url: string) => http.request<T>(url, { method: 'GET' }),

  getRaw: (url: string, options: Omit<RequestInit, 'method'> = {}) =>
    http.requestRaw(url, { ...options, method: 'GET' }),

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
