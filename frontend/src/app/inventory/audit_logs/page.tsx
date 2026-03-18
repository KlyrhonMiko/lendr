'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, Search, Loader2, AlertCircle, FileText, User, Calendar, Tag } from 'lucide-react';
import { inventoryAuditApi, AuditLog, AuditLogParams } from './api';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/lib/api';

export default function InventoryAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

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
      <div>
        <h1 className="text-4xl font-bold font-heading mb-2">Inventory Audit Logs</h1>
        <p className="text-muted-foreground text-lg">Monitor all equipment movements, unit adjustments, and borrow requests.</p>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by Actor ID (e.g. ST-001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-10 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
          >
            <option value="">All Actions</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
            <option value="approved">Approved</option>
            <option value="released">Released</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
                <th className="p-4 pl-6">Timestamp</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Action</th>
                <th className="p-4">Actor</th>
                <th className="p-4 pr-6">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">Loading audit trail...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.audit_id} className="hover:bg-muted/30 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{log.created_at.split(' - ')[0]}</span>
                        <span className="text-xs text-muted-foreground">{log.created_at.split(' - ')[1]}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-indigo-400 font-mono tracking-tighter">{log.entity_id}</span>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{log.entity_type}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                        log.action === 'deleted' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                        log.action === 'created' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        {log.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{log.user_id || 'System'}</span>
                        <span className="text-[10px] text-muted-foreground">EMP: {log.employee_id || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="p-4 pr-6">
                      <span className="text-sm text-muted-foreground line-clamp-1 italic">
                        {log.reason_code || '---'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && (
          <Pagination
            meta={meta}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        )}
      </div>
    </div>
  );
}
