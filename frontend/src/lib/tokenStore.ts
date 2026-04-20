'use client';

const TOKEN_KEY = 'powergold_auth_token';

let inMemoryToken: string | null = null;
const tokenListeners = new Set<() => void>();

function readSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export const tokenStore = {
  getToken(): string | null {
    if (inMemoryToken) {
      return inMemoryToken;
    }

    const storedToken = readSessionToken();
    if (storedToken) {
      inMemoryToken = storedToken;
    }

    return storedToken;
  },

  setToken(token: string): void {
    inMemoryToken = token;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(TOKEN_KEY, token);
    }

    tokenListeners.forEach((listener) => listener());
  },

  clearToken(): void {
    inMemoryToken = null;
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(TOKEN_KEY);
    }

    tokenListeners.forEach((listener) => listener());
  },

  hasToken(): boolean {
    return !!tokenStore.getToken();
  },

  subscribe(listener: () => void): () => void {
    tokenListeners.add(listener);

    return () => {
      tokenListeners.delete(listener);
    };
  },
};
