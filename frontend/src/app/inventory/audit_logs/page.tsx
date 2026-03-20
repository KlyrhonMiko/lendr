'use client';
import { useState, useEffect, useCallback } from 'react';
import { inventoryAuditApi } from './api';
import type { AuditLog, AuditLogParams } from './lib/types';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/lib/api';
import { AuditLogsHeader } from './components/AuditLogsHeader';
import { AuditLogsToolbar } from './components/AuditLogsToolbar';
import { AuditLogsTable } from './components/AuditLogsTable';
import { AlertCircle } from 'lucide-react';

export default function InventoryAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const toggleExpand = (id: string) => setExpandedAuditId(expandedAuditId === id ? null : id);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: AuditLogParams = {
        page,
        per_page: perPage,
        actor_id: search || undefined,
        action: actionFilter || undefined,
      };
      const res = await inventoryAuditApi.list(params);
      setLogs(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <AuditLogsHeader />

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <AuditLogsToolbar
          search={search}
          onSearchChange={setSearch}
          actionFilter={actionFilter}
          onActionFilterChange={setActionFilter}
        />

        <AuditLogsTable
          logs={logs}
          loading={loading}
          expandedAuditId={expandedAuditId}
          onToggleExpand={toggleExpand}
        />

        {meta && (
          <Pagination meta={meta} onPageChange={setPage} onPerPageChange={setPerPage} />
        )}
      </div>
    </div>
  );
}
