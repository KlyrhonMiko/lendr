'use client';

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
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold font-heading mb-2">Borrowing Management</h1>
        <p className="text-muted-foreground text-lg">Manage equipment requests and tracking.</p>
      </div>
      {meta && (
        <span className="text-sm text-muted-foreground font-medium">
          {meta.total} request{meta.total !== 1 ? 's' : ''}
          {statusFilter !== 'ALL' && <span className="text-indigo-400"> · {statusFilter}</span>}
        </span>
      )}
    </div>
  );
}

