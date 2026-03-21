import { api } from '@/lib/api';
import type { 
  AdminStats, 
  ActivityPoint, 
  UserInsights, 
  SystemRegistry 
} from './lib/types';

export const adminDashboardApi = {
  getStats: () => api.get<AdminStats>('/admin/dashboard/stats'),
  getActivity: () => api.get<ActivityPoint[]>('/admin/dashboard/activity'),
  getUsers: () => api.get<UserInsights>('/admin/dashboard/users'),
  getRegistry: () => api.get<SystemRegistry[]>('/admin/dashboard/registry'),
};
