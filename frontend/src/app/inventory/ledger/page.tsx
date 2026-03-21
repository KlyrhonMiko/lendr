'use client';

import { useState, useEffect, useCallback } from 'react';
import { ledgerApi, MovementLedgerParams, Anomaly, LedgerMovement } from './api';
import { inventorySettingsApi } from '../settings/api';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/lib/api';
import { toast } from 'sonner';
import type { MovementLedgerTab } from './components/MovementLedgerHeader';
import { MovementLedgerHeader } from './components/MovementLedgerHeader';
import { LedgerFiltersBar } from './components/LedgerFiltersBar';
import { MovementLedgerTable } from './components/MovementLedgerTable';
import { ReversalMovementModal } from './components/ReversalMovementModal';

export default function MovementLedgerPage() {
  const [movements, setMovements] = useState<LedgerMovement[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [activeTab, setActiveTab] = useState<MovementLedgerTab>('ledger');
  const [expandedAnomalyId, setExpandedAnomalyId] = useState<string | null>(null);

  const toggleAnomalyExpand = (id: string) => setExpandedAnomalyId(expandedAnomalyId === id ? null : id);

  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [movementType, setMovementType] = useState('');
  const [itemId, setItemId] = useState('');

  // Reversal Modal State
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<LedgerMovement | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalReasonCode, setReversalReasonCode] = useState('CORRECTION');
  const [reasonCodes, setReasonCodes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'ledger') {
        const params: MovementLedgerParams = {
          page,
          per_page: perPage,
          movement_type: movementType || undefined,
          inventory_id: itemId || undefined,
        };
        const res = await ledgerApi.list(params);
        setMovements(res.data);
        if (res.meta) setMeta(res.meta);
      } else {
        const res = await ledgerApi.getAnomalies();
        setAnomalies(res.data);
        setMeta(null);
      }
    } catch (err: any) {
      toast.error('Failed to fetch ledger data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, perPage, movementType, itemId]);

  const fetchReasonCodes = useCallback(async () => {
    try {
      const res = await inventorySettingsApi.listInventory({
        category: 'inventory_movements_reason_code',
      });
      if (res.data.length > 0) {
        setReasonCodes(res.data.map((s: any) => s.key));
      } else {
        setReasonCodes(['CORRECTION', 'ERROR', 'DUPLICATE_ENTRY', 'DAMAGED_ON_ARRIVAL']);
      }
    } catch (err) {
      setReasonCodes(['CORRECTION', 'ERROR', 'DUPLICATE_ENTRY', 'DAMAGED_ON_ARRIVAL']);
    }
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  useEffect(() => {
    fetchReasonCodes();
  }, [fetchReasonCodes]);

  const openReversalModal = (movement: LedgerMovement) => {
    setSelectedMovement(movement);
    setReversalReason('');
    setReversalReasonCode('CORRECTION');
    setIsReversalModalOpen(true);
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovement || !selectedMovement.movement_id || !reversalReason) return;
    
    setIsSubmitting(true);
    try {
      await ledgerApi.reverse(selectedMovement.movement_id, reversalReason, reversalReasonCode);
      toast.success('Movement reversal record created successfully');
      setIsReversalModalOpen(false);
      fetchLedger();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reverse movement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <MovementLedgerHeader
        activeTab={activeTab}
        anomalies={anomalies}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setExpandedAnomalyId(null);
        }}
      />

      <section
        className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
        aria-label={activeTab === 'ledger' ? 'Movement history' : 'Detected issues'}
      >
        {activeTab === 'ledger' && (
          <LedgerFiltersBar
            itemId={itemId}
            onItemIdChange={setItemId}
            movementType={movementType}
            onMovementTypeChange={setMovementType}
            meta={meta}
          />
        )}

        <MovementLedgerTable
          activeTab={activeTab}
          loading={loading}
          movements={movements}
          anomalies={anomalies}
          expandedAnomalyId={expandedAnomalyId}
          onToggleAnomalyExpand={toggleAnomalyExpand}
          onOpenReversalModal={(movement) => openReversalModal(movement)}
        />

        {meta && activeTab === 'ledger' && (
          <Pagination meta={meta} onPageChange={setPage} onPerPageChange={setPerPage} />
        )}
      </section>

      <ReversalMovementModal
        open={isReversalModalOpen}
        selectedMovement={selectedMovement}
        reasonCodes={reasonCodes}
        reversalReasonCode={reversalReasonCode}
        onReversalReasonCodeChange={setReversalReasonCode}
        reversalReason={reversalReason}
        onReversalReasonChange={setReversalReason}
        isSubmitting={isSubmitting}
        onCancel={() => setIsReversalModalOpen(false)}
        onSubmit={handleReverseSubmit}
      />
    </div>
  );
}
