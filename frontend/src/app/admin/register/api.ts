import { api } from '@/lib/api';

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
}

export const registerApi = {
  register: async (userData: RegisterPayload) => {
    return api.post('/admin/users/register', userData);
  }
};