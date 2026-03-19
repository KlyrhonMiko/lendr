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

export const auth = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
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
    }
  },

  logout: async (redirectTo = '/auth/login') => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);

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
