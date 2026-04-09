'use client';

import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { tokenStore } from '@/lib/tokenStore';
import { getCorrelationId, logger, setCorrelationId } from '@/lib/logger';
import { buildApiRequestUrl } from '@/lib/apiPath';

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
  error_type?: string;
  correlation_id?: string;
}

interface ErrorPayload {
  message?: string;
  detail?: string;
  error_type?: string;
  correlation_id?: string;
}

export class HttpRequestError extends Error {
  status: number;
  payload: ErrorPayload;

  constructor(status: number, message: string, payload: ErrorPayload = {}) {
    super(message);
    this.name = 'HttpRequestError';
    this.status = status;
    this.payload = payload;
  }
}

export class MaintenanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaintenanceError';
  }
}

const MAINTENANCE_ACTIVE_KEY = 'lendr:maintenance:active';
const MAINTENANCE_MESSAGE_KEY = 'lendr:maintenance:message';

function setMaintenanceState(message: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(MAINTENANCE_ACTIVE_KEY, 'true');
  window.sessionStorage.setItem(MAINTENANCE_MESSAGE_KEY, message);
}

function clearMaintenanceState(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(MAINTENANCE_ACTIVE_KEY);
  window.sessionStorage.removeItem(MAINTENANCE_MESSAGE_KEY);
}

function isMaintenanceStateActive(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(MAINTENANCE_ACTIVE_KEY) === 'true';
}

/** 
 * Unique browser/hardware fingerprint.
 */
let fpPromise: Promise<string> | null = null;

export async function getDeviceId(): Promise<string> {
  if (typeof window === 'undefined') return 'server';

  const cachedId = window.sessionStorage.getItem('lendr_fp_id');
  if (cachedId) return cachedId;

  if (!fpPromise) {
    fpPromise = (async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const visitorId = `FP-${result.visitorId}`;
        window.sessionStorage.setItem('lendr_fp_id', visitorId);
        return visitorId;
      } catch (error) {
        logger.error('Fingerprint failed, falling back to UUID', { error });
        let fallbackId = window.sessionStorage.getItem('lendr_device_id');
        if (!fallbackId) {
          fallbackId = `DEV-${crypto.randomUUID()}`;
          window.sessionStorage.setItem('lendr_device_id', fallbackId);
        }
        return fallbackId;
      }
    })();
  }

  return fpPromise;
}

export const http = {
  getToken: () => {
    return tokenStore.getToken();
  },

  requestRaw: async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const token = http.getToken();
    const deviceId = await getDeviceId();
    const correlationId = getCorrelationId();

    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    headers.set('X-Device-ID', deviceId);
    if (correlationId) {
      headers.set('X-Correlation-ID', correlationId);
    }

    const response = await fetch(buildApiRequestUrl(url), {
      ...options,
      headers,
    });

    const responseCorrelationId = response.headers.get('X-Correlation-ID');
    if (responseCorrelationId) {
      setCorrelationId(responseCorrelationId);
    }

    if (response.ok && isMaintenanceStateActive()) {
      clearMaintenanceState();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lendr:maintenance-ended'));
      }
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as ErrorPayload;
      const errorPayload: ErrorPayload = {
        ...errorData,
        correlation_id: errorData.correlation_id ?? responseCorrelationId ?? undefined,
      };

      // Handle Maintenance Mode
      if (response.status === 503 && errorPayload.error_type === 'MaintenanceMode') {
        if (typeof window !== 'undefined') {
          const message = errorPayload.message || 'System under maintenance';
          setMaintenanceState(message);
          window.dispatchEvent(new CustomEvent('lendr:maintenance-started', { detail: message }));
        }
        throw new MaintenanceError(errorPayload.message || 'System under maintenance');
      }

      // Handle 401 (Unauthorized)
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          // Token is invalid, clear it
          tokenStore.clearToken();

          // Only redirect if not already on login page to avoid infinite loops
          if (window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/admin/login') {
            window.location.href = '/auth/login';
          }
        }
      }

      throw new HttpRequestError(
        response.status,
        errorPayload.message || errorPayload.detail || 'An error occurred during the request',
        errorPayload,
      );
    }

    return response;
  },

  request: async <T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    const response = await http.requestRaw(url, options);
    return response.json();
  },
};
