'use client';

import { Fragment } from 'react';
import { ChevronDown, ChevronUp, Loader2, ShieldCheck } from 'lucide-react';
import type { AuditLog } from '../api';
import { DataDiffView } from '@/components/ui/DataDiffView';

export function AuditLogsTable({
  logs,
  loading,
  expandedAuditId,
  toggleExpand,
}: {
  logs: AuditLog[];
  loading: boolean;
  expandedAuditId: string | null;
  toggleExpand: (id: string) => void;
}) {
  return (
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
                  className={`hover:bg-muted/30 transition-colors group cursor-pointer ${
                    expandedAuditId === log.audit_id ? 'bg-muted/50' : ''
                  }`}
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
  );
}

