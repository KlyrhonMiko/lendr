'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { borrowerApi } from '../api';

const BORROWER_ROLES = new Set(['borrower', 'brwr']);

const HISTORY_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'released', label: 'Released' },
  { value: 'returned', label: 'Returned' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];

function normalizeRole(role: string | undefined): string {
  return (role || '').trim().toLowerCase();
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function formatEventType(value: string): string {
  return value
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ');
}

export default function BorrowerHistoryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const isBorrower = BORROWER_ROLES.has(normalizeRole(user?.role));

  useEffect(() => {
    if (!loading && user && !isBorrower) {
      router.replace(auth.getRedirectPath(user.role));
    }
  }, [isBorrower, loading, router, user]);

  const historyQuery = useQuery({
    queryKey: ['borrower', 'request-history', user?.user_id, statusFilter, page],
    enabled: Boolean(user && isBorrower),
    queryFn: () =>
      borrowerApi.listRequestHistory({
        page,
        per_page: 10,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  const historyItems = historyQuery.data?.data || [];
  const historyMeta = historyQuery.data?.meta;

  const pageInfo = useMemo(() => {
    const total = historyMeta?.total || 0;
    const limit = historyMeta?.limit || 10;
    const offset = historyMeta?.offset || (page - 1) * limit;

    const from = total === 0 ? 0 : offset + 1;
    const to = Math.min(offset + limit, total);
    const hasNextPage = offset + limit < total;

    return {
      total,
      from,
      to,
      hasNextPage,
    };
  }, [historyMeta, page]);

  if (loading || !user || !isBorrower) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading borrower history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Borrow Request History
        </h1>
        <p className="text-sm text-muted-foreground">
          Read-only timeline of your borrow requests from submission to closure.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>History Records</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              This section is view-only and cannot modify any request state.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Filter request status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {HISTORY_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={() => void historyQuery.refetch()}
              disabled={historyQuery.isFetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${historyQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {historyQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your request history...
            </div>
          )}

          {historyQuery.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Failed to load borrow request history. Please try again.
            </div>
          )}

          {!historyQuery.isLoading && !historyQuery.isError && historyItems.length === 0 && (
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              No borrow requests found for the selected filter.
            </div>
          )}

          {!historyQuery.isLoading &&
            !historyQuery.isError &&
            historyItems.map((entry) => (
              <article key={entry.request_id} className="rounded-xl border border-border bg-card p-4 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Request ID</p>
                    <p className="text-sm font-semibold text-foreground">{entry.request_id}</p>
                    <p className="text-xs text-muted-foreground mt-1">Transaction: {entry.transaction_ref}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      {entry.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Requested</p>
                    <p className="font-medium text-foreground">{formatDateTime(entry.request_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Expected return</p>
                    <p className="font-medium text-foreground">{formatDateTime(entry.return_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Closed</p>
                    <p className="font-medium text-foreground">{formatDateTime(entry.closed_at)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Requested items</p>
                  <ul className="space-y-1 text-sm">
                    {entry.items.map((item) => (
                      <li key={`${entry.request_id}-${item.item_id}`} className="flex items-center justify-between">
                        <span className="text-foreground">{item.name}</span>
                        <span className="text-muted-foreground">x{item.qty_requested}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Request timeline</p>
                  {entry.events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No timeline events available.</p>
                  ) : (
                    <ul className="space-y-2">
                      {entry.events.map((event) => (
                        <li
                          key={event.event_id}
                          className="rounded-lg border border-border/70 bg-muted/10 px-3 py-2 text-sm"
                        >
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <span className="font-medium text-foreground">{formatEventType(event.event_type)}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(event.occurred_at)}
                            </span>
                          </div>
                          {event.actor_name && (
                            <p className="text-xs text-muted-foreground mt-1">By: {event.actor_name}</p>
                          )}
                          {event.note && <p className="text-xs text-foreground/90 mt-1">{event.note}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Showing {pageInfo.from} to {pageInfo.to} of {pageInfo.total} requests
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || historyQuery.isFetching}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current + 1)}
                disabled={!pageInfo.hasNextPage || historyQuery.isFetching}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
