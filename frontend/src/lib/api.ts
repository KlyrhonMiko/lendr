import { auth } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ data: T; message?: string }> {
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
  login: async (formData: any) => {
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

  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  
  post: <T>(url: string, data: any) => 
    request<T>(url, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  patch: <T>(url: string, data: any) => 
    request<T>(url, { 
      method: 'PATCH', 
      body: JSON.stringify(data) 
    }),
  
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
