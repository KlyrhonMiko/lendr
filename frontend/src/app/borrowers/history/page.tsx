'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Clock3, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBorrowerHistory } from '../lib/useBorrowerQueries';

function getStatusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'approved' || normalized === 'released' || normalized === 'returned') {
    return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
  }
  if (normalized === 'rejected' || normalized === 'cancelled' || normalized === 'closed') {
    return 'bg-rose-500/10 text-rose-700 border-rose-500/20';
  }
  return 'bg-primary/10 text-primary border-primary/20';
}

export default function BorrowerHistoryPage() {
  const [page, setPage] = useState(1);
  const perPage = 10;

  const { data, isLoading, error, refetch } = useBorrowerHistory({ page, per_page: perPage });

  const requests = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold font-heading">Borrowing History</h1>
        <p className="text-sm text-muted-foreground">
          Read-only timeline of your requests, items, and status events.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading request history...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{(error as Error).message}</p>
            <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No borrow requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.request_id}>
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-lg font-heading">{request.request_id}</CardTitle>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getStatusClass(request.status)}`}
                  >
                    {request.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <p>
                    <span className="font-semibold text-foreground">Transaction:</span> {request.transaction_ref}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Requested:</span> {request.request_date}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Return At:</span> {request.return_at || 'Not set'}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Location:</span> {request.location_name || 'N/A'}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Items</h2>
                  <ul className="space-y-2">
                    {request.items.map((item) => (
                      <li
                        key={`${request.request_id}-${item.item_id}`}
                        className="rounded-lg border border-border bg-muted/20 p-3 text-sm"
                      >
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-muted-foreground">
                          {item.item_id} • Qty: {item.qty_requested}
                          {item.classification ? ` • ${item.classification}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Events</h2>
                  {request.events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events recorded.</p>
                  ) : (
                    <ul className="space-y-3">
                      {request.events.map((event) => (
                        <li key={event.event_id} className="rounded-lg border border-border bg-background p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold uppercase tracking-wider text-foreground">
                              {event.event_type.replace(/_/g, ' ')}
                            </p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock3 className="h-3.5 w-3.5" />
                              {event.occurred_at}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Actor: {event.actor_name || event.actor_user_id || 'System'}
                          </p>
                          {event.note ? (
                            <p className="mt-1 text-sm text-muted-foreground">Note: {event.note}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} {meta ? `• ${meta.total} total request(s)` : ''}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
