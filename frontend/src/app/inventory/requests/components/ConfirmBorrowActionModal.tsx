'use client';

import type { BorrowAction } from '../lib/types';
import { Info } from 'lucide-react';

export function ConfirmBorrowActionModal({
  confirmingAction,
  actionNotes,
  onActionNotesChange,
  onCancel,
  onConfirm,
}: {
  confirmingAction: { action: BorrowAction; requestId: string; actionLabel: string } | null;
  actionNotes: string;
  onActionNotesChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!confirmingAction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-heading">
                {confirmingAction.actionLabel} Request
              </h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to{' '}
                {confirmingAction.actionLabel.toLowerCase()} this borrow request?
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                Notes / Remarks (Optional)
              </label>
              <textarea
                autoFocus
                value={actionNotes}
                onChange={(e) => onActionNotesChange(e.target.value)}
                placeholder={`Provide a reason for this ${confirmingAction.actionLabel.toLowerCase()}...`}
                className="w-full h-32 p-4 rounded-2xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onCancel}
              className="flex-1 h-12 rounded-2xl border border-border font-bold text-sm hover:bg-muted/50 transition-all"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-12 rounded-2xl bg-indigo-500 text-indigo-50 text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all"
              type="button"
            >
              Confirm {confirmingAction.actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

