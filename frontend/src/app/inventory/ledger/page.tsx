'use client';

import { useState } from 'react';
import { ledgerApi, MovementLedgerParams, Anomaly, LedgerMovement } from './api';
import { useLedgerMovements, useLedgerAnomalies, useReasonCodes, useLedgerMutations } from './lib/useLedgerQueries';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/lib/api';
import { toast } from 'sonner';
import type { MovementLedgerTab } from './components/MovementLedgerHeader';
import { MovementLedgerHeader } from './components/MovementLedgerHeader';
import { LedgerFiltersBar } from './components/LedgerFiltersBar';
import { MovementLedgerTable } from './components/MovementLedgerTable';
import { ReversalMovementModal } from './components/ReversalMovementModal';

export default function MovementLedgerPage() {
  const [activeTab, setActiveTab] = useState<MovementLedgerTab>('ledger');
  const [expandedAnomalyId, setExpandedAnomalyId] = useState<string | null>(null);

  const toggleAnomalyExpand = (id: string) => setExpandedAnomalyId(expandedAnomalyId === id ? null : id);

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: movementsResponse, isLoading: movementsLoading } = useLedgerMovements(
    { page, per_page: perPage, movement_type: movementType || undefined, inventory_id: itemId || undefined },
    activeTab === 'ledger'
  );

  const { data: anomaliesResponse, isLoading: anomaliesLoading } = useLedgerAnomalies(activeTab === 'anomalies');
  
  const { data: reasonCodesResponse } = useReasonCodes();
  const { reverseMovement } = useLedgerMutations();

  const movements = movementsResponse?.data || [];
  const meta = movementsResponse?.meta || null;
  const anomalies = anomaliesResponse?.data || [];
  const reasonCodes = reasonCodesResponse || ['CORRECTION', 'ERROR', 'DUPLICATE_ENTRY', 'DAMAGED_ON_ARRIVAL'];
  const loading = activeTab === 'ledger' ? movementsLoading : anomaliesLoading;

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
      await reverseMovement.mutateAsync({ id: selectedMovement.movement_id, reason: reversalReason, reasonCode: reversalReasonCode });
      toast.success('Movement reversal record created successfully');
      setIsReversalModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reverse movement';
      toast.error(message);
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
