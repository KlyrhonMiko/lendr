'use client';

import { Loader2, CheckCircle2, RefreshCw, X, FileText, AlertTriangle } from 'lucide-react';
import type { LedgerMovement } from '../lib/types';

export function ReversalMovementModal({
  open,
  selectedMovement,
  reasonCodes,
  reversalReasonCode,
  onReversalReasonCodeChange,
  reversalReason,
  onReversalReasonChange,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  selectedMovement: LedgerMovement | null;
  reasonCodes: string[];
  reversalReasonCode: string;
  onReversalReasonCodeChange: (v: string) => void;
  reversalReason: string;
  onReversalReasonChange: (v: string) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
}) {
  if (!open || !selectedMovement) return null;

  return (
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
          <button
            onClick={onCancel}
            className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Original Movement Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">Equipment</p>
                <p className="text-sm font-semibold truncate">{selectedMovement.item_name || 'System Item'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">Qty Change</p>
                <p
                  className={`text-sm font-bold ${
                    selectedMovement.qty_change > 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {selectedMovement.qty_change > 0 ? '+' : ''}
                  {selectedMovement.qty_change}
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
                onChange={(e) => onReversalReasonCodeChange(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium text-sm"
              >
                {reasonCodes.map((code) => (
                  <option key={code} value={code}>
                    {code.replace(/_/g, ' ')}
                  </option>
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
                onChange={(e) => onReversalReasonChange(e.target.value)}
                placeholder="Provide a detailed explanation for this reversal..."
                className="w-full h-32 p-4 rounded-2xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium text-sm resize-none"
              />
              <p className="text-[10px] text-muted-foreground italic">
                This action will create a counter-transaction and update the item's current stock balance.
              </p>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
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
  );
}

