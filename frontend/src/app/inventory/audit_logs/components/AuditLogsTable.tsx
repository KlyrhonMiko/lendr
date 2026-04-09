'use client';

import { Fragment } from 'react';
import { ChevronDown, ChevronUp, History, Loader2 } from 'lucide-react';
import type { AuditLog } from '../lib/types';
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
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
        <p className="text-sm font-medium">Loading audit logs...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <History className="w-12 h-12 text-muted-foreground/20" />
        <p className="text-base font-medium text-muted-foreground">No audit logs found</p>
        <p className="text-sm text-muted-foreground/60">Try adjusting your search or filters above.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      <div className="hidden md:grid md:grid-cols-[1fr_1.5fr_1fr_1.5fr_44px] gap-4 px-6 py-3 text-xs font-medium text-muted-foreground bg-muted/20">
        <span>Timestamp</span>
        <span>Entity</span>
        <span>Action</span>
        <span>Actor</span>
        <span />
      </div>

      {logs.map((log) => (
        <Fragment key={log.audit_id}>
          <div
            onClick={() => toggleExpand(log.audit_id)}
            className={`group px-6 py-4 hover:bg-muted/20 transition-colors cursor-pointer ${expandedAuditId === log.audit_id ? 'bg-muted/30' : ''
              }`}
          >
            <div className="hidden md:grid md:grid-cols-[1fr_1.5fr_1fr_1.5fr_44px] gap-4 items-center">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-foreground">{log.created_at.split(' - ')[0]}</span>
                <span className="text-xs text-muted-foreground truncate">{log.created_at.split(' - ')[1] || ''}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{log.entity_id}</span>
                <span className="text-xs text-muted-foreground uppercase">{log.entity_type}</span>
              </div>
              <span className="text-sm text-foreground capitalize min-w-0 truncate">{log.action.replace(/_/g, ' ')}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{log.user_id || 'System'}</span>
                <span className="text-xs text-muted-foreground truncate">ID: {log.employee_id || '—'}</span>
              </div>
              <div className="flex justify-end">
                <div className="text-muted-foreground/50 group-hover:text-primary transition-colors">
                  {expandedAuditId === log.audit_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>

            <div className="md:hidden space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">{log.entity_id}</p>
                <p className="text-xs text-muted-foreground uppercase">{log.entity_type}</p>
                <p className="text-xs text-muted-foreground mt-1">{log.created_at}</p>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="capitalize">{log.action.replace(/_/g, ' ')}</span>
                <span>{log.user_id || 'System'}</span>
              </div>
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(log.audit_id);
                  }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {expandedAuditId === log.audit_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {expandedAuditId === log.audit_id && (
            <div className="bg-muted/20 px-6 py-4 border-t border-border/60">
              <DataDiffView before={log.before_json} after={log.after_json} />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
