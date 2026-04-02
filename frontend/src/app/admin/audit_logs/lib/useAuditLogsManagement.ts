'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuditLogParams } from '../api';
import { useAdminAuditLogs } from './useAuditLogQueries';

const DEFAULT_PER_PAGE = 10;

function timeframeToDateFrom(timeframe: string): string | undefined {
  if (timeframe === 'all') return undefined;

  const date = new Date();
  if (timeframe === '24h') date.setHours(date.getHours() - 24);
  else if (timeframe === '7d') date.setDate(date.getDate() - 7);
  else if (timeframe === '30d') date.setDate(date.getDate() - 30);
  return date.toISOString();
}

export function useAuditLogsManagement() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [timeframe, setTimeframe] = useState('all');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const date_from = useMemo(() => timeframeToDateFrom(timeframe), [timeframe]);

  // Params
  const params: AuditLogParams = {
    page,
    per_page: perPage,
    actor_id: search || undefined,
    entity_type: entityFilter || undefined,
    date_from,
  };

  // Queries
  const { data: logsRes, isLoading: loading, error: auditError } = useAdminAuditLogs(params);

  const logs = logsRes?.data || [];
  const meta = logsRes?.meta || null;
  const error = auditError?.message || null;

  const toggleExpand = useCallback((id: string) => {
    setExpandedAuditId((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, entityFilter, timeframe, perPage]);

  return {
    // data
    logs,
    meta,
    loading,
    error,
    // filters
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
    // expand
    expandedAuditId,
    toggleExpand,
  };
}

