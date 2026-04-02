import { http, HttpRequestError } from '@/lib/http';
import { tokenStore } from '@/lib/tokenStore';

export interface User {
  user_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  role: string;
  is_active?: boolean;
}
let logoutTimer: NodeJS.Timeout | null = null;
let lastActivityTime = Date.now();
let listenersBound = false;

const activityEvents: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll'];

const updateActivity = () => {
  lastActivityTime = Date.now();
};

function bindActivityListeners(): void {
  if (typeof window === 'undefined' || listenersBound) return;

  for (const eventName of activityEvents) {
    window.addEventListener(eventName, updateActivity, { passive: true });
  }
  listenersBound = true;
}

function unbindActivityListeners(): void {
  if (typeof window === 'undefined' || !listenersBound) return;

  for (const eventName of activityEvents) {
    window.removeEventListener(eventName, updateActivity);
  }
  listenersBound = false;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payloadBase64Url = token.split('.')[1];
    if (!payloadBase64Url) return null;
    const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(payloadBase64);
    return JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const auth = {
  setupTokenTimer: (token: string) => {
    if (typeof window === 'undefined') return;
    auth.clearTokenTimer();
    bindActivityListeners();
    
    try {
      const payload = parseJwtPayload(token);
      
      if (!payload || typeof payload.exp !== 'number') return;
      
      const checkInterval = 60 * 1000; // Check every 1 minute
      const REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh when <= 5 mins left
      const IDLE_TIMEOUT = 10 * 60 * 1000; // Only refresh if active in last 10 mins
      
      logoutTimer = setInterval(async () => {
        const currentToken = auth.getToken();
        if (!currentToken) {
          auth.clearTokenTimer();
          return;
        }

        try {
          const currentPayload = parseJwtPayload(currentToken);
          if (!currentPayload || typeof currentPayload.exp !== 'number') {
            auth.logout();
            return;
          }

          const currentExpTime = currentPayload.exp * 1000;
          const now = Date.now();
          const timeRemaining = currentExpTime - now;
          
          if (timeRemaining <= 0) {
            auth.logout();
          } else if (timeRemaining <= REFRESH_THRESHOLD) {
            if (now - lastActivityTime < IDLE_TIMEOUT) {
              try {
                const refreshResponse = await http.request<{ access_token: string }>('/auth/refresh', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${currentToken}` },
                });

                const refreshedToken =
                  (refreshResponse as { access_token?: string }).access_token ||
                  refreshResponse.data?.access_token;

                if (refreshedToken) {
                  // Update the token in storage, this restarts the cycle.
                  tokenStore.setToken(refreshedToken);
                }
              } catch (error: unknown) {
                if (error instanceof HttpRequestError && error.status === 401) {
                  auth.logout();
                }

                // Keep existing token until expiry if refresh fails transiently.
              }
            } else {
              // User is idle but token not yet expired. Just wait for natural expiration.
            }
          }
        } catch {
          auth.clearTokenTimer();
        }
      }, checkInterval);
      
    } catch {
      auth.clearTokenTimer();
    }
  },

  clearTokenTimer: () => {
    if (logoutTimer) {
      clearInterval(logoutTimer);
      logoutTimer = null;
    }
  },
  setToken: (token: string) => {
    tokenStore.setToken(token);
    auth.setupTokenTimer(token);
  },

  getToken: () => {
    return tokenStore.getToken();
  },

  clearToken: () => {
    tokenStore.clearToken();
    auth.clearTokenTimer();
    unbindActivityListeners();
  },

  logout: async (redirectTo = '/auth/login') => {
    if (typeof window !== 'undefined') {
      const token = tokenStore.getToken();
      auth.clearToken();

      if (token) {
        try {
          await http.request('/auth/logout', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            keepalive: true,
          });
        } catch {
          // Ignore network errors during logout and proceed with client redirect.
        }
      }

      window.location.href = redirectTo;
    }
  },

  isAuthenticated: () => {
    return tokenStore.hasToken();
  },

  getUser: async (): Promise<User | null> => {
    const token = auth.getToken();
    if (!token) return null;

    try {
      const result = await http.request<User>('/auth/me', { method: 'GET' });
      return result.data;
    } catch (error) {
      // Re-throw MaintenanceError so it's caught by the Context/Wrapper
      throw error;
    }
  },

  getRedirectPath: (role?: string): string => {
    if (!role) return '/auth/login';
    
    const ROLE_REDIRECT_MAP: Record<string, string> = {
      'admin': '/admin/dashboard',
      'inventory_manager': '/inventory/dashboard',
      'dispatch': '/inventory/dashboard',
      'borrower': '/borrow_portal/request_form',
      'finance_manager': '/inventory/dashboard',
      'accountant': '/inventory/dashboard',
      'employee': '/borrow_portal/request_form',
    };

    return ROLE_REDIRECT_MAP[role.toLowerCase()] || '/borrow_portal/request_form';
  }
};
