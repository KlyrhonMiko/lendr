'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PaginationMeta } from '@/lib/api';
import { inventoryAuditApi } from '../api';
import type { AuditLog, AuditLogParams } from '../lib/types';

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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: AuditLogParams = {
        page,
        per_page: perPage,
        actor_id: search || undefined,
        entity_type: entityFilter || undefined,
        date_from,
      };

      const res = await inventoryAuditApi.list(params);
      setLogs(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, entityFilter, date_from]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
