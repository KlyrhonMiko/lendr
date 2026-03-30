import { useQuery } from '@tanstack/react-query';
import { adminDashboardApi } from '../dashboard-api';

const STALE_TIME_DASHBOARD = 1000 * 60; // 1 minute

export function useAdminDashboardData() {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'all'],
    queryFn: async () => {
      const [statsRes, activityRes, usersRes, registryRes] = await Promise.all([
        adminDashboardApi.getStats(),
        adminDashboardApi.getActivity(),
        adminDashboardApi.getUsers(),
        adminDashboardApi.getRegistry(),
      ]);
      return {
        stats: statsRes.data,
        activity: activityRes.data,
        userInsights: usersRes.data,
        registry: registryRes.data,
      };
    },
    staleTime: STALE_TIME_DASHBOARD,
  });
}
