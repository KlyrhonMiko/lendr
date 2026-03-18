'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { Search, CheckCircle2, AlertCircle, Clock, Loader2, Info, ChevronDown, ChevronRight, History } from 'lucide-react';
import { borrowApi, BorrowListParams, BorrowRequestEvent } from './api';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/lib/api';
import { toast } from 'sonner';

interface BorrowRecord {
  request_id: string;
  borrower_user_id?: string;
  items: Array<{
    item_id: string;
    name: string;
    qty_requested: number;
    classification?: string;
    item_type?: string;
    is_trackable?: boolean;
  }>;
  status: string;
  notes?: string;
  request_date: string;
  approved_at?: string;
  released_at?: string;
  returned_at?: string;
  is_emergency?: boolean;
  closed_at?: string;
  closed_by_user_id?: string;
  close_reason?: string;
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

  const [requestEvents, setRequestEvents] = useState<Record<string, BorrowRequestEvent[]>>({});
  const [loadingEvents, setLoadingEvents] = useState<Record<string, boolean>>({});

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [confirmingAction, setConfirmingAction] = useState<{
    action: BorrowAction;
    requestId: string;
    actionLabel: string;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState('');

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

  const fetchRequestEvents = useCallback(async (requestId: string) => {
    if (requestEvents[requestId]) return;
    setLoadingEvents(prev => ({ ...prev, [requestId]: true }));
    try {
      const res = await borrowApi.getEvents(requestId);
      setRequestEvents(prev => ({ ...prev, [requestId]: res.data as BorrowRequestEvent[] }));
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoadingEvents(prev => ({ ...prev, [requestId]: false }));
    }
  }, [requestEvents]);

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
    close: borrowApi.close,
  } as const;

  type BorrowAction = keyof typeof actionHandlers;

  const handleAction = async (action: BorrowAction, requestId: string, notes?: string) => {
    try {
      if (action === 'warehouse_reject') {
        await borrowApi.warehouseReject(requestId, notes);
      } else {
        await actionHandlers[action](requestId, { notes });
      }
      toast.success(`Request updated: ${action.replaceAll('_', ' ')}`);
      fetchRecords();
      setConfirmingAction(null);
      setActionNotes('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${action} request`;
      setError(msg);
      toast.error(msg);
    }
  };

  const toggleRow = (requestId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
        fetchRequestEvents(requestId);
      }
      return next;
    });
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
                <th className="p-4 pl-6 w-10"></th>
                <th className="p-4">Request ID</th>
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
              ) : records.map((record) => {
                const isExpanded = expandedIds.has(record.request_id);
                return (
                  <Fragment key={record.request_id}>
                    <tr 
                      onClick={() => toggleRow(record.request_id)}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                    >
                      <td className="p-4 pl-6">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs text-indigo-400">
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
                          record.status === 'closed' ? 'bg-slate-500/10 text-slate-500' :
                          'bg-indigo-500/10 text-indigo-500'
                        }`}>
                          {record.status === 'pending' && <Clock className="w-3 h-3" />}
                          {record.status === 'returned' && <CheckCircle2 className="w-3 h-3" />}
                          <span className="capitalize">
                            {record.status === 'closed' 
                              ? `Closed - ${record.close_reason || 'Finalized'}` 
                              : record.status.replace(/_/g, ' ')}
                          </span>
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{record.request_date}</td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {record.status === 'pending' && (
                            <>
                              <button onClick={() => setConfirmingAction({ action: 'approve', requestId: record.request_id, actionLabel: 'Approve' })} className="px-4 py-1.5 text-xs font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-all border border-amber-500/20">Approve</button>
                              <button onClick={() => setConfirmingAction({ action: 'reject', requestId: record.request_id, actionLabel: 'Reject' })} className="px-4 py-1.5 text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-all border border-rose-500/20">Reject</button>
                            </>
                          )}
                          {record.status === 'approved' && (
                            <>
                              <button onClick={() => setConfirmingAction({ action: 'release', requestId: record.request_id, actionLabel: 'Release' })} className="px-4 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-all border border-blue-500/20">Release</button>
                              <button onClick={() => setConfirmingAction({ action: 'send_to_warehouse', requestId: record.request_id, actionLabel: 'Send to Warehouse' })} className="px-4 py-1.5 text-xs font-bold bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 rounded-lg transition-all border border-violet-500/20">Send Warehouse</button>
                            </>
                          )}
                          {record.status === 'sent_to_warehouse' && (
                            <>
                              <button onClick={() => setConfirmingAction({ action: 'warehouse_approve', requestId: record.request_id, actionLabel: 'Warehouse Approve' })} className="px-4 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-all border border-emerald-500/20">Warehouse Approve</button>
                              <button onClick={() => setConfirmingAction({ action: 'warehouse_reject', requestId: record.request_id, actionLabel: 'Warehouse Reject' })} className="px-4 py-1.5 text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-all border border-rose-500/20">Warehouse Reject</button>
                            </>
                          )}
                          {record.status === 'warehouse_approved' && (
                            <button onClick={() => setConfirmingAction({ action: 'release', requestId: record.request_id, actionLabel: 'Release' })} className="px-4 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-all border border-blue-500/20">Release</button>
                          )}
                          {record.status === 'released' && (
                            <button onClick={() => setConfirmingAction({ action: 'return', requestId: record.request_id, actionLabel: 'Return' })} className="px-4 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-all border border-emerald-500/20">Return</button>
                          )}
                          {record.status === 'returned' && (
                            <button onClick={() => setConfirmingAction({ action: 'close', requestId: record.request_id, actionLabel: 'Close' })} className="px-4 py-1.5 text-xs font-bold bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 rounded-lg transition-all border border-slate-500/20">Close</button>
                          )}
                          {(record.status === 'rejected' || record.status === 'warehouse_rejected') && (
                            <>
                              <button onClick={() => setConfirmingAction({ action: 'close', requestId: record.request_id, actionLabel: 'Close' })} className="px-4 py-1.5 text-xs font-bold bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 rounded-lg transition-all border border-slate-500/20">Close</button>
                              <button onClick={() => setConfirmingAction({ action: 'reopen', requestId: record.request_id, actionLabel: 'Reopen' })} className="px-4 py-1.5 text-xs font-bold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 rounded-lg transition-all border border-indigo-500/20">Reopen</button>
                            </>
                          )}
                          {record.status === 'released' && record.items.every(it => !it.is_trackable) && (
                            <button onClick={() => setConfirmingAction({ action: 'close', requestId: record.request_id, actionLabel: 'Close' })} className="px-4 py-1.5 text-xs font-bold bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 rounded-lg transition-all border border-slate-500/20">Close</button>
                          )}
                          {record.status === 'closed' && (
                            <span className="text-[10px] font-medium text-muted-foreground">Finalized on {record.closed_at?.split(' ')[0]}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/10 border-b border-border/30">
                        <td className="p-0" colSpan={7}>
                          <div className="p-6 pl-16 animate-in slide-in-from-top-2 duration-300">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                              <Info className="w-3.5 h-3.5" />
                              Requested Items Details
                            </h4>
                            <div className="grid grid-cols-1 gap-4 max-w-3xl">
                              <table className="w-full text-xs bg-background/50 rounded-xl overflow-hidden border border-border/50">
                                <thead>
                                  <tr className="bg-muted/50 text-left border-b border-border/50">
                                    <th className="p-3 font-semibold text-muted-foreground">Item ID</th>
                                    <th className="p-3 font-semibold text-muted-foreground">Name</th>
                                    <th className="p-3 font-semibold text-muted-foreground">Classification</th>
                                    <th className="p-3 font-semibold text-muted-foreground">Type</th>
                                    <th className="p-3 font-semibold text-muted-foreground text-right">Quantity</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {record.items.map((item, idx) => (
                                    <tr key={`${record.request_id}-${item.item_id}-${idx}`} className="hover:bg-muted/20">
                                      <td className="p-3 font-mono text-indigo-400">{item.item_id}</td>
                                      <td className="p-3 font-medium text-foreground">{item.name}</td>
                                      <td className="p-3 text-muted-foreground uppercase tracking-tight">{item.classification || '---'}</td>
                                      <td className="p-3 text-muted-foreground uppercase tracking-tight">{item.item_type || '---'}</td>
                                      <td className="p-3 text-right font-bold text-foreground">{item.qty_requested}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="mt-8">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                <History className="w-3.5 h-3.5" />
                                Request History Timeline
                              </h4>
                              
                              {loadingEvents[record.request_id] ? (
                                <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-xl border border-border/30">
                                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                  <span className="text-xs font-medium text-muted-foreground">Fetching transaction history...</span>
                                </div>
                              ) : requestEvents[record.request_id] && requestEvents[record.request_id].length > 0 ? (
                                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/50">
                                  {requestEvents[record.request_id].map((event, idx) => (
                                    <div key={event.event_id} className="relative group">
                                      <div className={`absolute -left-[29px] top-1.5 w-6 h-6 rounded-full border-4 border-card flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-sm ${
                                        idx === 0 ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-muted border-border'
                                      }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-white' : 'bg-muted-foreground/50'}`} />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs font-bold text-foreground uppercase tracking-tight">
                                            {event.event_type.replace('_', ' ')}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground font-medium">
                                            {event.occurred_at}
                                          </span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">By: {event.actor_user_id || 'System'}</span>
                                          {event.note && (
                                            <span className="text-xs text-muted-foreground italic line-clamp-2 bg-muted/30 px-2 py-0.5 rounded border border-border/20">
                                              "{event.note}"
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 text-center border border-dashed border-border rounded-xl">
                                  <p className="text-xs text-muted-foreground">No history events found for this request.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
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
        {/* action confirmation modal */}
        {confirmingAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setConfirmingAction(null)} />
            <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Info className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-heading">{confirmingAction.actionLabel} Request</h3>
                    <p className="text-sm text-muted-foreground">Are you sure you want to {confirmingAction.actionLabel.toLowerCase()} this borrow request?</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Notes / Remarks (Optional)</label>
                    <textarea
                      autoFocus
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder={`Provide a reason for this ${confirmingAction.actionLabel.toLowerCase()}...`}
                      className="w-full h-32 p-4 rounded-2xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setConfirmingAction(null)}
                    className="flex-1 h-12 rounded-2xl border border-border font-bold text-sm hover:bg-muted/50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAction(confirmingAction.action, confirmingAction.requestId, actionNotes)}
                    className="flex-1 h-12 rounded-2xl bg-indigo-500 text-indigo-50 text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all"
                  >
                    Confirm {confirmingAction.actionLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
