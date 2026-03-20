'use client';

import { RotateCcw, Trash2 } from 'lucide-react';
import type { UserConfirmAction } from '../lib/types';

export function ConfirmActionModal({
  action,
  onCancel,
  onConfirm,
}: {
  action: UserConfirmAction;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl p-8 animate-in zoom-in-95">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
            action.type === 'delete' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
          }`}
        >
          {action.type === 'delete' ? <Trash2 className="w-8 h-8" /> : <RotateCcw className="w-8 h-8" />}
        </div>

        <h3 className="text-xl font-bold text-center mb-2">
          {action.type === 'delete' ? 'Deactivate' : 'Restore'} User?
        </h3>

        <p className="text-sm text-muted-foreground text-center mb-8">
          Are you sure you want to {action.type === 'delete' ? 'deactivate' : 'restore'} account for{' '}
          <span className="font-bold text-foreground">@{action.user.username}</span>?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 rounded-2xl border border-border font-bold text-sm hover:bg-muted/50 transition-all uppercase"
          >
            No, cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-12 rounded-2xl text-white font-bold text-sm shadow-lg transition-all uppercase ${
              action.type === 'delete'
                ? 'bg-rose-500 shadow-rose-500/20 hover:bg-rose-600'
                : 'bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600'
            }`}
          >
            Yes, proceed
          </button>
        </div>
      </div>
    </div>
  );
}

