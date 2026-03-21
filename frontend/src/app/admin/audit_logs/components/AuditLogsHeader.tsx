'use client';

import { History } from 'lucide-react';

export function AuditLogsHeader() {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-indigo-500/10 items-center justify-center shrink-0">
          <History className="w-6 h-6 text-indigo-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Trace administrative actions, security changes, and system configuration updates.
          </p>
        </div>
      </div>
    </div>
  );
}

