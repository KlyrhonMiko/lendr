import { useQueries } from '@tanstack/react-query';
import { dashboardApi } from '../dashboard-api';

const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export function useDashboardData() {
  const results = useQueries({
    queries: [
      {
        queryKey: ['inventory', 'dashboard', 'stats'],
        queryFn: async () => (await dashboardApi.getStats()).data,
        staleTime: STALE_TIME,
        refetchOnWindowFocus: true,
      },
      {
        queryKey: ['inventory', 'dashboard', 'recent'],
        queryFn: async () => (await dashboardApi.getRecent()).data,
        staleTime: STALE_TIME,
        refetchOnWindowFocus: true,
      },
      {
        queryKey: ['inventory', 'dashboard', 'lowStock'],
        queryFn: async () => (await dashboardApi.getLowStock()).data,
        staleTime: STALE_TIME,
        refetchOnWindowFocus: true,
      },
      {
        queryKey: ['inventory', 'dashboard', 'pendingCounts'],
        queryFn: async () => (await dashboardApi.getPendingCounts()).data,
        staleTime: STALE_TIME,
        refetchOnWindowFocus: true,
      },
      {
        queryKey: ['inventory', 'dashboard', 'breakdown'],
        queryFn: async () => (await dashboardApi.getInventoryBreakdown()).data,
        staleTime: STALE_TIME,
        refetchOnWindowFocus: true,
      },
      {
        queryKey: ['inventory', 'dashboard', 'health'],
        queryFn: async () => (await dashboardApi.getHealth()).data,
        staleTime: STALE_TIME,
        refetchOnWindowFocus: true,
      },
      {
        queryKey: ['inventory', 'dashboard', 'trends'],
        queryFn: async () => (await dashboardApi.getTrends()).data,
        staleTime: STALE_TIME,
        refetchOnWindowFocus: true,
      },
    ],
  });

  const isLoading = results.some((result) => result.isLoading);
  const isError = results.some((result) => result.isError);

  return {
    stats: results[0].data ?? null,
    recent: results[1].data ?? [],
    lowStock: results[2].data ?? [],
    pendingCounts: results[3].data ?? {},
    breakdown: results[4].data ?? [],
    health: results[5].data ?? null,
    trends: results[6].data ?? [],
    isLoading,
    isError,
  };
}
