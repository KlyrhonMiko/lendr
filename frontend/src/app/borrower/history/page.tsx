'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/auth';
import { Pagination } from '@/components/ui/Pagination';
import { borrowerApi } from '../api';

import { HistoryHeader } from './components/HistoryHeader';
import { HistoryToolbar } from './components/HistoryToolbar';
import { HistoryTable } from './components/HistoryTable';
import { useDebounce } from './hooks/useDebounce';

const BORROWER_ROLES = new Set(['borrower', 'brwr']);

function normalizeRole(role: string | undefined): string {
  return (role || '').trim().toLowerCase();
}

export default function BorrowerHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const debouncedSearch = useDebounce(searchInput, 400);

  const isBorrower = BORROWER_ROLES.has(normalizeRole(user?.role));

  useEffect(() => {
    if (!authLoading && user && !isBorrower) {
      router.replace(auth.getRedirectPath(user.role));
    }
  }, [isBorrower, authLoading, router, user]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch, perPage]);

  const historyQuery = useQuery({
    queryKey: ['borrower', 'request-history', user?.user_id, statusFilter, debouncedSearch, page, perPage],
    enabled: Boolean(user && isBorrower),
    queryFn: () =>
      borrowerApi.listRequestHistory({
        page,
        per_page: perPage,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      }),
  });

  const historyItems = historyQuery.data?.data || [];
  const historyMeta = historyQuery.data?.meta || null;

  if (authLoading || !user || !isBorrower) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/50">
        <div className="flex flex-col items-center gap-4 text-muted-foreground animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-wide">Initializing session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 animate-in fade-in duration-700">
      <HistoryHeader meta={historyMeta} statusFilter={statusFilter} />

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
        <HistoryToolbar
          search={searchInput}
          onSearchChange={setSearchInput}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <HistoryTable
          records={historyItems}
          loading={historyQuery.isLoading}
        />

        {historyMeta && (
          <div className="bg-muted/10 border-t border-border/50">
            <Pagination
              meta={historyMeta}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {historyQuery.isError && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-4 flex items-center gap-4 text-destructive shadow-sm animate-in slide-in-from-bottom-2">
          <div className="p-2 rounded-full bg-destructive/10">
            <span className="text-lg font-bold">!</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Network Connectivity Issue</p>
            <p className="text-xs opacity-80">Failed to synchronize your borrow history. Please check your connection or try again.</p>
          </div>
          <button
            onClick={() => void historyQuery.refetch()}
            className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition-all active:scale-95"
          >
            Retry Sync
          </button>
        </div>
      )}
    </div>
  );
}
