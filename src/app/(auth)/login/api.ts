import { api } from '@/lib/api';

export const loginApi = {
  login: async (credentials: any) => {
    return api.login(credentials);
  }
};
