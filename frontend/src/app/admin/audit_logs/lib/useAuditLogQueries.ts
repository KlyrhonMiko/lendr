import { useQuery } from '@tanstack/react-query';
import { adminAuditApi, AuditLogParams } from '../api';

const STALE_TIME_AUDIT = 1000 * 30; // 30 seconds

export function useAdminAuditLogs(params: AuditLogParams) {
  return useQuery({
    queryKey: ['admin', 'audit', 'list', params],
    queryFn: () => adminAuditApi.list(params),
    staleTime: STALE_TIME_AUDIT,
  });
}
