'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Search, Filter, Loader2, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, ChevronRight, X, FileText, CheckCircle2 } from 'lucide-react';
import { ledgerApi, MovementLedgerParams } from './api';
import { inventorySettingsApi } from '../settings/api';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/lib/api';
import { toast } from 'sonner';

export default function MovementLedgerPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ledger' | 'anomalies'>('ledger');
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [movementType, setMovementType] = useState('');
  const [itemId, setItemId] = useState('');

  // Reversal Modal State
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<any | null>(null);
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

  const openReversalModal = (movement: any) => {
    setSelectedMovement(movement);
    setReversalReason('');
    setReversalReasonCode('CORRECTION');
    setIsReversalModalOpen(true);
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovement || !reversalReason) return;
    
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
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-heading mb-2">Inventory Movement Ledger</h1>
          <p className="text-muted-foreground text-lg">System-wide transactional record of all equipment inflows and outflows.</p>
        </div>
        <div className="flex p-1.5 bg-muted rounded-2xl border border-border">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'ledger' ? 'bg-indigo-500 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ledger
          </button>
          <button
            onClick={() => setActiveTab('anomalies')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'anomalies' ? 'bg-rose-500 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Anomalies
            {anomalies.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                {anomalies.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        {activeTab === 'ledger' && (
          <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
            <div className="relative w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Item ID..."
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border text-sm font-medium"
              />
            </div>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="h-10 px-4 rounded-xl bg-input/30 border border-border text-sm font-medium"
            >
              <option value="">All Movement Types</option>
              <option value="procurement">Procurement</option>
              <option value="manual_adjustment">Adjustments</option>
              <option value="borrow_release">Releases</option>
              <option value="borrow_return">Returns</option>
              <option value="damage">Damage/Loss</option>
            </select>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-bold font-heading">
                <th className="p-4 pl-6 text-center w-20">Type</th>
                <th className="p-4">Equipment & ID</th>
                <th className="p-4">Qty Change</th>
                <th className="p-4">Movement Details</th>
                <th className="p-4">Actor</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={6} className="p-16 text-center font-medium text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-500" />Searching records...</td></tr>
              ) : activeTab === 'ledger' && movements.length === 0 ? (
                <tr><td colSpan={6} className="p-16 text-center text-muted-foreground"><Activity className="w-12 h-12 mx-auto mb-4 opacity-10" />No movements recorded.</td></tr>
              ) : activeTab === 'anomalies' && anomalies.length === 0 ? (
                <tr><td colSpan={6} className="p-16 text-center text-muted-foreground"><ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-10 text-emerald-500" />System reconciled. No anomalies detected.</td></tr>
              ) : (activeTab === 'ledger' ? movements : anomalies).map((move) => (
                <tr key={move.movement_id || `${move.item_id}-${move.anomaly_type}`} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-4 pl-6 text-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto relative ${
                      move.is_reversed ? 'bg-muted text-muted-foreground border border-border opacity-50' :
                      move.qty_change > 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                      move.qty_change < 0 ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                      'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {move.qty_change > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      {move.is_reversed && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-background border border-border rounded-full flex items-center justify-center">
                          <X className="w-2.5 h-2.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground line-clamp-1">{move.item_name || 'System Item'}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{move.inventory_id || move.item_id}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className={`text-lg font-bold ${move.is_reversed ? 'text-muted-foreground line-through opacity-50' : move.qty_change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {move.qty_change > 0 ? '+' : ''}{move.qty_change}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1">
                        {move.movement_type === 'reversal' && <RefreshCw className="w-2 h-2" />}
                        {move.movement_type?.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 max-w-md">
                    <div className="flex flex-col">
                      <span className={`text-sm text-foreground line-clamp-1 ${move.is_reversed ? 'italic text-muted-foreground' : ''}`}>
                        {move.is_reversed ? `[VOIDED] ${move.note || move.message}` : (move.note || move.message || 'Standard transaction recorded.')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{move.occurred_at || move.detected_at}</span>
                        {move.reference_id && move.movement_type === 'reversal' && (
                          <span className="text-[9px] font-mono bg-indigo-500/5 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/10">
                            Ref: {move.reference_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-foreground">{move.actor_id || 'SYSTEM'}</span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    {activeTab === 'ledger' && (
                      <div className="flex items-center justify-end gap-2">
                        {move.is_reversed && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-500/5 text-rose-500 border border-rose-500/10 uppercase tracking-tighter">
                            Voided
                          </span>
                        )}
                        {move.movement_type === 'reversal' && !move.is_reversed && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-tighter">
                            Correction
                          </span>
                        )}
                        {!move.is_reversed && move.movement_type !== 'reversal' && (
                          <button 
                            onClick={() => openReversalModal(move)} 
                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 rounded-xl text-rose-500 transition-all"
                            title="Reverse movement"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                    {activeTab === 'anomalies' && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase ${
                        move.severity === 'high' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {move.severity} RISK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta && activeTab === 'ledger' && (
          <Pagination
            meta={meta}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        )}
      </div>
      {/* Reversal Modal */}
      {isReversalModalOpen && selectedMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border/50 bg-rose-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-heading text-foreground">Reverse Transaction</h2>
                  <p className="text-xs text-muted-foreground font-mono">{selectedMovement.movement_id}</p>
                </div>
              </div>
              <button onClick={() => setIsReversalModalOpen(false)} className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReverseSubmit} className="p-6 space-y-6">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Original Movement Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Equipment</p>
                    <p className="text-sm font-semibold truncate">{selectedMovement.item_name || 'System Item'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Qty Change</p>
                    <p className={`text-sm font-bold ${selectedMovement.qty_change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {selectedMovement.qty_change > 0 ? '+' : ''}{selectedMovement.qty_change}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Occurrence</p>
                    <p className="text-sm font-medium">{selectedMovement.occurred_at}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Original Note</p>
                    <p className="text-sm italic truncate">"{selectedMovement.note || 'No note available.'}"</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Reason Code
                  </label>
                  <select
                    required
                    value={reversalReasonCode}
                    onChange={(e) => setReversalReasonCode(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium text-sm"
                  >
                    {reasonCodes.map(code => (
                      <option key={code} value={code}>{code.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Explain why you are reversing this
                  </label>
                  <textarea
                    required
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    placeholder="Provide a detailed explanation for this reversal..."
                    className="w-full h-32 p-4 rounded-2xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium text-sm resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground italic">This action will create a counter-transaction and update the item's current stock balance.</p>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsReversalModalOpen(false)} 
                  className="flex-1 py-3 rounded-xl font-bold bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !reversalReason}
                  className="flex-[1.5] py-3 rounded-xl font-bold bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Execute Reversal
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
