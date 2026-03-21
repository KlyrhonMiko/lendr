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


const TOKEN_KEY = 'lendr_auth_token';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

let logoutTimer: NodeJS.Timeout | null = null;
let lastActivityTime = Date.now();

if (typeof window !== 'undefined') {
  const updateActivity = () => {
    lastActivityTime = Date.now();
  };
  window.addEventListener('mousemove', updateActivity, { passive: true });
  window.addEventListener('keydown', updateActivity, { passive: true });
  window.addEventListener('click', updateActivity, { passive: true });
  window.addEventListener('scroll', updateActivity, { passive: true });
}

export const auth = {
  setupTokenTimer: (token: string) => {
    if (typeof window === 'undefined') return;
    auth.clearTokenTimer();
    
    try {
      const payloadBase64Url = token.split('.')[1];
      const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      
      if (!payload.exp) return;
      
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
          const currentPayloadJson = atob(currentToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
          const currentPayload = JSON.parse(currentPayloadJson);
          const currentExpTime = currentPayload.exp * 1000;
          const now = Date.now();
          const timeRemaining = currentExpTime - now;
          
          if (timeRemaining <= 0) {
            auth.logout();
          } else if (timeRemaining <= REFRESH_THRESHOLD) {
            if (now - lastActivityTime < IDLE_TIMEOUT) {
              try {
                const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${currentToken}` }
                });
                if (response.ok) {
                  const data = await response.json();
                  // Update the token in storage, this restarts the cycle
                  localStorage.setItem(TOKEN_KEY, data.access_token);
                } else if (response.status === 401) {
                  auth.logout();
                }
              } catch (e) {
                console.error("Failed to refresh token", e);
              }
            } else {
              // User is idle but token not yet expired. Just wait for natural expiration.
            }
          }
        } catch (e) {
          auth.clearTokenTimer();
        }
      }, checkInterval);
      
    } catch (e) {
      console.error('Failed to parse token expiration', e);
    }
  },

  clearTokenTimer: () => {
    if (logoutTimer) {
      clearInterval(logoutTimer);
      logoutTimer = null;
    }
  },
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      auth.setupTokenTimer(token);
    }
  },

  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  clearToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      auth.clearTokenTimer();
    }
  },

  logout: async (redirectTo = '/auth/login') => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      auth.clearTokenTimer();

      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
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
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem(TOKEN_KEY);
    }
    return false;
  },

  getUser: async (): Promise<User | null> => {
    const token = auth.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          auth.logout();
        }
        return null;
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return null;
    }
  },

  getRedirectPath: (role?: string): string => {
    if (!role) return '/auth/login';
    
    const ROLE_REDIRECT_MAP: Record<string, string> = {
      'admin': '/admin/dashboard',
      'inventory_manager': '/inventory/dashboard',
      'dispatch': '/inventory/dashboard',
      'warehouse_manager': '/inventory/dashboard',
      'borrower': '/borrow_portal/request_form',
      'finance_manager': '/inventory/dashboard',
      'accountant': '/inventory/dashboard',
      'employee': '/borrow_portal/request_form',
    };

    return ROLE_REDIRECT_MAP[role.toLowerCase()] || '/borrow_portal/request_form';
  }
};
