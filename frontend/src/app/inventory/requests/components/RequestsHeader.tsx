'use client';

import { Package } from 'lucide-react';
import type { StatusTab } from '../lib/types';
import type { PaginationMeta } from '@/lib/api';

export function RequestsHeader({
  meta,
  statusFilter,
}: {
  meta: PaginationMeta | null;
  statusFilter: StatusTab;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">Borrowing Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track and manage equipment borrow requests.</p>
        </div>
      </div>
      {meta && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 font-medium">
            {meta.total}
            <span className="text-muted-foreground/70">
              {meta.total === 1 ? 'request' : 'requests'}
            </span>
          </span>
          {statusFilter !== 'ALL' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 text-primary font-medium capitalize">
              {statusFilter.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
