'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuditLogs } from './useAuditLogQueries';

const DEFAULT_PER_PAGE = 10;

function timeframeToDateFrom(timeframe: string): string | undefined {
  if (timeframe === 'all') return undefined;

  const date = new Date();
  if (timeframe === '24h') date.setHours(date.getHours() - 24);
  else if (timeframe === '7d') date.setDate(date.getDate() - 7);
  else if (timeframe === '30d') date.setDate(date.getDate() - 30);
  return date.toISOString();
}

export function useInventoryAuditLogsManagement() {

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [timeframe, setTimeframe] = useState('all');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const date_from = useMemo(() => timeframeToDateFrom(timeframe), [timeframe]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedAuditId((prev) => (prev === id ? null : id));
  }, []);

  const { data: logsResponse, isLoading: loading, error: queryError } = useAuditLogs({
    page,
    per_page: perPage,
    actor_id: search || undefined,
    entity_type: entityFilter || undefined,
    date_from,
  });

  const logs = logsResponse?.data || [];
  const meta = logsResponse?.meta || null;
  const error = queryError ? (queryError as Error).message : null;

  return {
    logs,
    meta,
    loading,
    error,
    page,
    setPage,
    perPage,
    setPerPage,
    search,
    setSearch,
    entityFilter,
    setEntityFilter,
    timeframe,
    setTimeframe,
    expandedAuditId,
    toggleExpand,
  };
}
