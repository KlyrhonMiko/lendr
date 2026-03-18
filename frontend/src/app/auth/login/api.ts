import { api } from '@/lib/api';

interface LoginCredentials {
  username: string;
  password: string;
}

export const loginApi = {
  login: async (credentials: LoginCredentials) => {
    return api.login(credentials);
  }
};
