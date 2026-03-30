import { useQuery } from '@tanstack/react-query';
import { inventoryAuditApi, AuditLogParams } from '../api';

const STALE_TIME = 1000 * 60; // 1 minute

export function useAuditLogs(params: AuditLogParams) {
  return useQuery({
    queryKey: ['inventory', 'audit_logs', params],
    queryFn: async () => await inventoryAuditApi.list(params),
    staleTime: STALE_TIME,
    placeholderData: (previousData) => previousData, // keep previous data on pagination
  });
}
