import { api } from '@/lib/api';
export const registerApi = {
  register: async (userData: any) => {
    return api.post('/admin/users/register', userData);
  }
};