'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { borrowApi, BorrowListParams, BorrowRequestEvent, BorrowRequest } from './api';
import { Pagination } from '@/components/ui/Pagination';
import { UnitSelectionModal } from './UnitSelectionModal';
import type { PaginationMeta } from '@/lib/api';
import { toast } from 'sonner';
import type { StatusTab } from './lib/types';
import { RequestsHeader } from './components/RequestsHeader';
import { RequestsToolbar } from './components/RequestsToolbar';
import { RequestsTable } from './components/RequestsTable';
import { ConfirmBorrowActionModal } from './components/ConfirmBorrowActionModal';

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
  const [statusFilter, setStatusFilter] = useState<StatusTab>('ALL');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [confirmingAction, setConfirmingAction] = useState<{
    action: BorrowAction;
    requestId: string;
    actionLabel: string;
  } | null>(null);
  const [assigningRequest, setAssigningRequest] = useState<BorrowRecord | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, { units: any[], batches: any[] }>>({});

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

  const fetchAssignments = useCallback(async (requestId: string) => {
    try {
      const [units, batches] = await Promise.all([
        borrowApi.getAssignedUnits(requestId),
        borrowApi.getAssignedBatches(requestId)
      ]);
      setAssignmentsMap(prev => ({
        ...prev,
        [requestId]: { units: units.data, batches: batches.data }
      }));
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  }, []);

  const isFullyAssigned = useCallback((record: BorrowRecord) => {
    const assignments = assignmentsMap[record.request_id];
    if (!assignments) return false;
    
    const totalRequested = record.items.reduce((sum, item) => sum + item.qty_requested, 0);
    const totalAssignedUnits = assignments.units.length;
    const totalAssignedBatches = assignments.batches.reduce((sum, b) => sum + b.qty_assigned, 0);
    
    return (totalAssignedUnits + totalAssignedBatches) >= totalRequested;
  }, [assignmentsMap]);

  useEffect(() => {
    records.forEach(record => {
      if (['approved', 'warehouse_approved'].includes(record.status) && !assignmentsMap[record.request_id]) {
        fetchAssignments(record.request_id);
      }
    });
  }, [records, fetchAssignments, assignmentsMap]);

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
      <RequestsHeader meta={meta} statusFilter={statusFilter} />

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <RequestsToolbar
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <RequestsTable
          records={records}
          loading={loading}
          expandedIds={expandedIds}
          onToggleRow={toggleRow}
          requestEvents={requestEvents}
          loadingEvents={loadingEvents}
          statusFilter={statusFilter}
          onClearStatusFilter={() => setStatusFilter('ALL')}
          onSetConfirmingAction={(args) => setConfirmingAction(args)}
          onSetAssigningRequest={(record) => setAssigningRequest(record)}
          isFullyAssigned={isFullyAssigned}
        />

        {meta && (
          <Pagination meta={meta} onPageChange={setPage} onPerPageChange={setPerPage} />
        )}

        <ConfirmBorrowActionModal
          confirmingAction={confirmingAction}
          actionNotes={actionNotes}
          onActionNotesChange={setActionNotes}
          onCancel={() => setConfirmingAction(null)}
          onConfirm={() => {
            if (!confirmingAction) return;
            void handleAction(confirmingAction.action, confirmingAction.requestId, actionNotes);
          }}
        />

        {assigningRequest && (
          <UnitSelectionModal
            request={assigningRequest as unknown as BorrowRequest}
            onClose={() => setAssigningRequest(null)}
            onSuccess={() => {
              const requestId = assigningRequest.request_id;
              setAssigningRequest(null);
              fetchRecords();
              fetchAssignments(requestId);
              fetchRequestEvents(requestId);
            }}
          />
        )}
      </div>
    </div>
  );
}
