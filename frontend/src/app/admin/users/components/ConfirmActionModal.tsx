'use client';

import { RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
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
  const isDelete = action.type === 'delete';
  const fullName = `${action.user.first_name} ${action.user.last_name}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-8 animate-in zoom-in-95 duration-200">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 ${
            isDelete ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
          }`}
        >
          {isDelete ? <AlertTriangle className="w-7 h-7" /> : <RotateCcw className="w-7 h-7" />}
        </div>

        <h3 className="text-lg font-semibold text-center mb-2">
          {isDelete ? 'Deactivate' : 'Restore'} this user?
        </h3>

        <p className="text-sm text-muted-foreground text-center mb-2 leading-relaxed">
          You are about to {isDelete ? 'deactivate' : 'restore'} the account for{' '}
          <span className="font-semibold text-foreground">{fullName}</span>.
        </p>

        <p className="text-sm text-center mb-8 leading-relaxed">
          {isDelete ? (
            <span className="text-red-500/80">
              This user will no longer be able to log in or access the system.
            </span>
          ) : (
            <span className="text-emerald-600/80">
              This user will be able to log in and use the system again.
            </span>
          )}
        </p>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            No, Go Back
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-12 rounded-lg text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              isDelete
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {isDelete ? (
              <>
                <Trash2 className="w-4 h-4" />
                Yes, Deactivate
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Yes, Restore
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
