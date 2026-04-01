'use client';

import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { tokenStore } from '@/lib/tokenStore';

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
  error_type?: string;
}

export class MaintenanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaintenanceError';
  }
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
        console.error('Fingerprint failed, falling back to UUID', error);
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

  request: async <T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    const token = http.getToken();
    const deviceId = await getDeviceId();

    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    headers.set('X-Device-ID', deviceId);

    const response = await fetch(`${API_BASE_URL}/api${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle Maintenance Mode
      if (response.status === 503 && errorData.error_type === 'MaintenanceMode') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lendr:maintenance-started', { detail: errorData.message }));
        }
        throw new MaintenanceError(errorData.message || 'System under maintenance');
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

      throw new Error(errorData.message || errorData.detail || 'An error occurred during the request');
    }

    return response.json();
  },
};
