'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle2, AlertCircle, Clock, Loader2, Info } from 'lucide-react';
import { borrowApi, BorrowListParams } from './api';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/lib/api';
import { toast } from 'sonner';

interface BorrowRecord {
  request_id: string;
  borrower_user_id?: string;
  items: Array<{
    item_id: string;
    qty_requested: number;
  }>;
  status: string;
  notes?: string;
  request_date: string;
  approved_at?: string;
  released_at?: string;
  returned_at?: string;
  is_emergency?: boolean;
}

const STATUS_TABS = ['ALL', 'pending', 'approved', 'sent_to_warehouse', 'warehouse_approved', 'released', 'returned', 'rejected', 'warehouse_rejected'];
const DEFAULT_PER_PAGE = 10;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function BorrowsPage() {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  const debouncedSearch = useDebounce(searchInput, 400);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: BorrowListParams = {
        page,
        per_page: perPage,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        borrower_id: debouncedSearch || undefined,
      };
      const res = await borrowApi.list(params);
      setRecords(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, statusFilter, debouncedSearch]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch, perPage]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const actionHandlers = {
    approve: borrowApi.approve,
    reject: borrowApi.reject,
    release: borrowApi.release,
    return: borrowApi.return,
    reopen: borrowApi.reopen,
    send_to_warehouse: borrowApi.sendToWarehouse,
    warehouse_approve: borrowApi.warehouseApprove,
    warehouse_reject: (id: string) => borrowApi.warehouseReject(id),
  } as const;

  type BorrowAction = keyof typeof actionHandlers;

  const handleAction = async (action: BorrowAction, requestId: string) => {
    try {
      await actionHandlers[action](requestId);
      toast.success(`Request updated: ${action.replaceAll('_', ' ')}`);
      fetchRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${action} request`;
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
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

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-background/50 flex items-center gap-4 flex-wrap">
          {/* Search by borrower ID */}
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by borrower ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
            />
          </div>

          {/* Status tabs — now drives server filter */}
          <div className="flex bg-input/30 p-1 rounded-xl border border-border overflow-x-auto flex-1">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize whitespace-nowrap ${
                  statusFilter === s
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
                <th className="p-4 pl-6">Request ID</th>
                <th className="p-4">Item &amp; Borrower</th>
                <th className="p-4">Qty</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date Requested</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <p className="font-medium">Loading requests...</p>
                    </div>
                  </td>
                </tr>
              ) : records.map((record) => (
                <tr key={record.request_id} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-4 pl-6 font-mono text-xs text-indigo-400">
                    {record.request_id}
                    {record.is_emergency && (
                      <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                        Emergency
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">
                        {record.items.map((item) => item.item_id).join(', ') || 'No Items'}
                      </span>
                      <span className="text-xs text-muted-foreground">User ID: {record.borrower_user_id ?? 'Unknown'}</span>
                      {record.notes && (
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md w-fit">
                          <Info className="w-3 h-3" />
                          {record.notes}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium text-foreground">
                    {record.items.reduce((sum, item) => sum + item.qty_requested, 0)}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 w-fit ${
                      record.status === 'returned' ? 'bg-emerald-500/10 text-emerald-500' :
                      record.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                      record.status === 'released' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-indigo-500/10 text-indigo-500'
                    }`}>
                      {record.status === 'pending' && <Clock className="w-3 h-3" />}
                      {record.status === 'returned' && <CheckCircle2 className="w-3 h-3" />}
                      <span className="capitalize">{record.status.replace(/_/g, ' ')}</span>
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{record.request_date}</td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {record.status === 'pending' && (
                        <>
                          <button onClick={() => handleAction('approve', record.request_id)} className="px-4 py-1.5 text-xs font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-all border border-amber-500/20">Approve</button>
                          <button onClick={() => handleAction('reject', record.request_id)} className="px-4 py-1.5 text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-all border border-rose-500/20">Reject</button>
                        </>
                      )}
                      {record.status === 'approved' && (
                        <>
                          <button onClick={() => handleAction('release', record.request_id)} className="px-4 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-all border border-blue-500/20">Release</button>
                          <button onClick={() => handleAction('send_to_warehouse', record.request_id)} className="px-4 py-1.5 text-xs font-bold bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 rounded-lg transition-all border border-violet-500/20">Send Warehouse</button>
                        </>
                      )}
                      {record.status === 'sent_to_warehouse' && (
                        <>
                          <button onClick={() => handleAction('warehouse_approve', record.request_id)} className="px-4 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-all border border-emerald-500/20">Warehouse Approve</button>
                          <button onClick={() => handleAction('warehouse_reject', record.request_id)} className="px-4 py-1.5 text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-all border border-rose-500/20">Warehouse Reject</button>
                        </>
                      )}
                      {record.status === 'warehouse_approved' && (
                        <button onClick={() => handleAction('release', record.request_id)} className="px-4 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-all border border-blue-500/20">Release</button>
                      )}
                      {record.status === 'released' && (
                        <button onClick={() => handleAction('return', record.request_id)} className="px-4 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-all border border-emerald-500/20">Return</button>
                      )}
                      {(record.status === 'rejected' || record.status === 'warehouse_rejected') && (
                        <button onClick={() => handleAction('reopen', record.request_id)} className="px-4 py-1.5 text-xs font-bold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 rounded-lg transition-all border border-indigo-500/20">Reopen</button>
                      )}
                      {record.status === 'returned' && (
                        <span className="text-[10px] font-medium text-muted-foreground">Completed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">No requests found.</p>
                    {statusFilter !== 'ALL' && (
                      <button onClick={() => setStatusFilter('ALL')} className="mt-2 text-sm text-indigo-400 hover:underline">Clear filter</button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
