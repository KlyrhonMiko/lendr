'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { History, Search, Loader2, AlertCircle, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { adminAuditApi, AuditLog, AuditLogParams } from './api';
import { Pagination } from '@/components/ui/Pagination';
import { DataDiffView } from '@/components/ui/DataDiffView';
import type { PaginationMeta } from '@/lib/api';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [timeframe, setTimeframe] = useState('all');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedAuditId(expandedAuditId === id ? null : id);
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let date_from: string | undefined;
      if (timeframe !== 'all') {
        const date = new Date();
        if (timeframe === '24h') date.setHours(date.getHours() - 24);
        else if (timeframe === '7d') date.setDate(date.getDate() - 7);
        else if (timeframe === '30d') date.setDate(date.getDate() - 30);
        date_from = date.toISOString();
      }

      const params: AuditLogParams = {
        page,
        per_page: perPage,
        actor_id: search || undefined,
        entity_type: entityFilter || undefined,
        date_from,
      };
      const res = await adminAuditApi.list(params);
      setLogs(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, entityFilter, timeframe]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold font-heading mb-2">System Audit Logs</h1>
        <p className="text-muted-foreground text-lg">Trace administrative actions, security changes, and system configuration updates.</p>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Actor ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
            />
          </div>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-10 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
            >
              <option value="">All Systems</option>
              <option value="user">User Account</option>
              <option value="role">Permissions & Roles</option>
              <option value="config">System Configuration</option>
              <option value="auth">Security & Session</option>
              <option value="session">Login & Sessions</option>
            </select>

            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="h-10 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium ml-auto"
            >
              <option value="all">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
                <th className="p-4 pl-6">Timestamp</th>
                <th className="p-4">System Entity</th>
                <th className="p-4">Action Taken</th>
                <th className="p-4">Administrator</th>
                <th className="p-4 pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">Fetching administrative trail...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    No administrative logs reported.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <Fragment key={log.audit_id}>
                    <tr 
                      onClick={() => toggleExpand(log.audit_id)}
                      className={`hover:bg-muted/30 transition-colors group cursor-pointer ${expandedAuditId === log.audit_id ? 'bg-muted/50' : ''}`}
                    >
                      <td className="p-4 pl-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{log.created_at.split(' - ')[0]}</span>
                          <span className="text-xs text-muted-foreground">{log.created_at.split(' - ')[1]}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold tracking-tight text-foreground">{log.entity_id}</span>
                          <span className="text-[10px] uppercase font-bold text-indigo-400">{log.entity_type}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium text-foreground">{log.action.replace('_', ' ')}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{log.user_id || 'Master'}</span>
                          <span className="text-[10px] text-muted-foreground">ID: {log.employee_id || 'ADM-001'}</span>
                        </div>
                      </td>
                      <td className="p-4 pr-6">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase">
                            Verified
                          </span>
                          <div className="text-muted-foreground/50 group-hover:text-indigo-500 transition-colors">
                            {expandedAuditId === log.audit_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedAuditId === log.audit_id && (
                      <tr className="bg-muted/20">
                        <td colSpan={5} className="p-0">
                          <DataDiffView before={log.before_json} after={log.after_json} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
