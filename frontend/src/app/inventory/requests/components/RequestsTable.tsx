'use client';

import { Fragment } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  Info,
  Loader2,
} from 'lucide-react';
import type { BorrowRecord, BorrowAction, StatusTab } from '../lib/types';
import type { BorrowRequestEvent } from '../api';

export function RequestsTable({
  records,
  loading,
  expandedIds,
  onToggleRow,
  requestEvents,
  loadingEvents,
  statusFilter,
  onClearStatusFilter,
  onSetConfirmingAction,
  onSetAssigningRequest,
  isFullyAssigned,
}: {
  records: BorrowRecord[];
  loading: boolean;
  expandedIds: Set<string>;
  onToggleRow: (requestId: string) => void;
  requestEvents: Record<string, BorrowRequestEvent[]>;
  loadingEvents: Record<string, boolean>;
  statusFilter: StatusTab;
  onClearStatusFilter: () => void;
  onSetConfirmingAction: (args: { action: BorrowAction; requestId: string; actionLabel: string }) => void;
  onSetAssigningRequest: (record: BorrowRecord) => void;
  isFullyAssigned: (record: BorrowRecord) => boolean;
}) {
  return (
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
              <td colSpan={7} className="p-12 text-center">
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
                  onClick={() => onToggleRow(record.request_id)}
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
                      <span className="text-xs text-muted-foreground">
                        User ID: {record.borrower_user_id ?? 'Unknown'}
                      </span>
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
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 w-fit ${
                        record.status === 'returned'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : record.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-500'
                            : record.status === 'released'
                              ? 'bg-blue-500/10 text-blue-500'
                              : record.status === 'closed'
                                ? 'bg-slate-500/10 text-slate-500'
                                : 'bg-indigo-500/10 text-indigo-500'
                      }`}
                    >
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
                    <div
                      className="flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {record.status === 'pending' && (
                        <>
                          <button
                            onClick={() =>
                              onSetConfirmingAction({
                                action: 'approve',
                                requestId: record.request_id,
                                actionLabel: 'Approve',
                              })
                            }
                            className="px-4 py-1.5 text-xs font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-all border border-amber-500/20"
                            type="button"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              onSetConfirmingAction({
                                action: 'reject',
                                requestId: record.request_id,
                                actionLabel: 'Reject',
                              })
                            }
                            className="px-4 py-1.5 text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-all border border-rose-500/20"
                            type="button"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {record.status === 'approved' && (
                        <>
                          <button
                            onClick={() => onSetAssigningRequest(record)}
                            className="px-4 py-1.5 text-xs font-bold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 rounded-lg transition-all border border-indigo-500/20"
                            type="button"
                          >
                            {isFullyAssigned(record) ? 'Reassign Inventory' : 'Assign Inventory'}
                          </button>
                          {isFullyAssigned(record) && (
                            <button
                              onClick={() =>
                                onSetConfirmingAction({
                                  action: 'release',
                                  requestId: record.request_id,
                                  actionLabel: 'Release',
                                })
                              }
                              className="px-4 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-all border border-blue-500/20"
                              type="button"
                            >
                              Release
                            </button>
                          )}
                          <button
                            onClick={() =>
                              onSetConfirmingAction({
                                action: 'send_to_warehouse',
                                requestId: record.request_id,
                                actionLabel: 'Send to Warehouse',
                              })
                            }
                            className="px-4 py-1.5 text-xs font-bold bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 rounded-lg transition-all border border-violet-500/20"
                            type="button"
                          >
                            Send Warehouse
                          </button>
                        </>
                      )}

                      {record.status === 'sent_to_warehouse' && (
                        <>
                          <button
                            onClick={() =>
                              onSetConfirmingAction({
                                action: 'warehouse_approve',
                                requestId: record.request_id,
                                actionLabel: 'Warehouse Approve',
                              })
                            }
                            className="px-4 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-all border border-emerald-500/20"
                            type="button"
                          >
                            Warehouse Approve
                          </button>
                          <button
                            onClick={() =>
                              onSetConfirmingAction({
                                action: 'warehouse_reject',
                                requestId: record.request_id,
                                actionLabel: 'Warehouse Reject',
                              })
                            }
                            className="px-4 py-1.5 text-xs font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-all border border-rose-500/20"
                            type="button"
                          >
                            Warehouse Reject
                          </button>
                        </>
                      )}

                      {record.status === 'warehouse_approved' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onSetAssigningRequest(record)}
                            className="px-4 py-1.5 text-xs font-bold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 rounded-lg transition-all border border-indigo-500/20"
                            type="button"
                          >
                            {isFullyAssigned(record) ? 'Reassign Inventory' : 'Assign Inventory'}
                          </button>
                          {isFullyAssigned(record) && (
                            <button
                              onClick={() =>
                                onSetConfirmingAction({
                                  action: 'release',
                                  requestId: record.request_id,
                                  actionLabel: 'Release',
                                })
                              }
                              className="px-4 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-all border border-blue-500/20"
                              type="button"
                            >
                              Release
                            </button>
                          )}
                        </div>
                      )}

                      {record.status === 'released' && (
                        <button
                          onClick={() =>
                            onSetConfirmingAction({
                              action: 'return',
                              requestId: record.request_id,
                              actionLabel: 'Return',
                            })
                          }
                          className="px-4 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-all border border-emerald-500/20"
                          type="button"
                        >
                          Return
                        </button>
                      )}

                      {record.status === 'returned' && (
                        <button
                          onClick={() =>
                            onSetConfirmingAction({
                              action: 'close',
                              requestId: record.request_id,
                              actionLabel: 'Close',
                            })
                          }
                          className="px-4 py-1.5 text-xs font-bold bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 rounded-lg transition-all border border-slate-500/20"
                          type="button"
                        >
                          Close
                        </button>
                      )}

                      {(record.status === 'rejected' || record.status === 'warehouse_rejected') && (
                        <>
                          <button
                            onClick={() =>
                              onSetConfirmingAction({
                                action: 'close',
                                requestId: record.request_id,
                                actionLabel: 'Close',
                              })
                            }
                            className="px-4 py-1.5 text-xs font-bold bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 rounded-lg transition-all border border-slate-500/20"
                            type="button"
                          >
                            Close
                          </button>
                          <button
                            onClick={() =>
                              onSetConfirmingAction({
                                action: 'reopen',
                                requestId: record.request_id,
                                actionLabel: 'Reopen',
                              })
                            }
                            className="px-4 py-1.5 text-xs font-bold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 rounded-lg transition-all border border-indigo-500/20"
                            type="button"
                          >
                            Reopen
                          </button>
                        </>
                      )}

                      {record.status === 'released' && record.items.every((it) => !it.is_trackable) && (
                        <button
                          onClick={() =>
                            onSetConfirmingAction({
                              action: 'close',
                              requestId: record.request_id,
                              actionLabel: 'Close',
                            })
                          }
                          className="px-4 py-1.5 text-xs font-bold bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 rounded-lg transition-all border border-slate-500/20"
                          type="button"
                        >
                          Close
                        </button>
                      )}

                      {record.status === 'closed' && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Finalized on {record.closed_at?.split(' ')[0]}
                        </span>
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
                                <tr
                                  key={`${record.request_id}-${item.item_id}-${idx}`}
                                  className="hover:bg-muted/20"
                                >
                                  <td className="p-3 font-mono text-indigo-400">{item.item_id}</td>
                                  <td className="p-3 font-medium text-foreground">{item.name}</td>
                                  <td className="p-3 text-muted-foreground uppercase tracking-tight">
                                    {item.classification || '---'}
                                  </td>
                                  <td className="p-3 text-muted-foreground uppercase tracking-tight">
                                    {item.item_type || '---'}
                                  </td>
                                  <td className="p-3 text-right font-bold text-foreground">
                                    {item.qty_requested}
                                  </td>
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
                              <span className="text-xs font-medium text-muted-foreground">
                                Fetching transaction history...
                              </span>
                            </div>
                          ) : requestEvents[record.request_id] &&
                            requestEvents[record.request_id].length > 0 ? (
                            <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/50">
                              {requestEvents[record.request_id].map((event, idx) => (
                                <div key={event.event_id} className="relative group">
                                  <div
                                    className={`absolute -left-[29px] top-1.5 w-6 h-6 rounded-full border-4 border-card flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-sm ${
                                      idx === 0
                                        ? 'bg-indigo-500 shadow-indigo-500/20'
                                        : 'bg-muted border-border'
                                    }`}
                                  >
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        idx === 0 ? 'bg-white' : 'bg-muted-foreground/50'
                                      }`}
                                    />
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
                                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">
                                        By: {event.actor_user_id || 'System'}
                                      </span>
                                      {event.note && (
                                        <span className="text-xs text-muted-foreground italic line-clamp-2 bg-muted/30 px-2 py-0.5 rounded border border-border/20">
                                          &quot;{event.note}&quot;
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center border border-dashed border-border rounded-xl">
                              <p className="text-xs text-muted-foreground">
                                No history events found for this request.
                              </p>
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
                <p className="font-medium">No requests found.</p>
                {statusFilter !== 'ALL' && (
                  <button
                    onClick={onClearStatusFilter}
                    className="mt-2 text-sm text-indigo-400 hover:underline"
                    type="button"
                  >
                    Clear filter
                  </button>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

