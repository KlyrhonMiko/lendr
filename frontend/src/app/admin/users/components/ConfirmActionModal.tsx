'use client';

import { RotateCcw, Trash2, AlertTriangle, KeyRound } from 'lucide-react';
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
  const isResetTwoFactor = action.type === 'reset_2fa';
  const fullName = `${action.user.first_name} ${action.user.last_name}`;

  const title = isDelete
    ? 'Deactivate this user?'
    : isResetTwoFactor
      ? 'Reset this user\'s 2FA?'
      : 'Restore this user?';

  const actionPhrase = isDelete
    ? 'deactivate the account for'
    : isResetTwoFactor
      ? 'reset 2FA for'
      : 'restore the account for';

  const detail = isDelete
    ? 'This user will no longer be able to log in or access the system.'
    : isResetTwoFactor
      ? 'This removes their current authenticator enrollment. They will need to set up a new authenticator device or recovery flow on their next sign in.'
      : 'This user will be able to log in and use the system again.';

  const iconStyle = isDelete
    ? 'bg-red-500/10 text-red-500'
    : isResetTwoFactor
      ? 'bg-amber-500/10 text-amber-600'
      : 'bg-emerald-500/10 text-emerald-500';

  const confirmStyle = isDelete
    ? 'bg-red-500 hover:bg-red-600'
    : isResetTwoFactor
      ? 'bg-amber-600 hover:bg-amber-700'
      : 'bg-emerald-500 hover:bg-emerald-600';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-8 animate-in zoom-in-95 duration-200">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 ${iconStyle}`}
        >
          {isDelete ? (
            <AlertTriangle className="w-7 h-7" />
          ) : isResetTwoFactor ? (
            <KeyRound className="w-7 h-7" />
          ) : (
            <RotateCcw className="w-7 h-7" />
          )}
        </div>

        <h3 className="text-lg font-semibold text-center mb-2">
          {title}
        </h3>

        <p className="text-sm text-muted-foreground text-center mb-2 leading-relaxed">
          You are about to {actionPhrase}{' '}
          <span className="font-semibold text-foreground">{fullName}</span>.
        </p>

        <p className="text-sm text-center mb-8 leading-relaxed">
          {isDelete ? (
            <span className="text-red-500/80">
              {detail}
            </span>
          ) : isResetTwoFactor ? (
            <span className="text-amber-700/90 dark:text-amber-300/90">
              {detail}
            </span>
          ) : (
            <span className="text-emerald-600/80">
              {detail}
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
            className={`flex-1 h-12 rounded-lg text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${confirmStyle}`}
          >
            {isDelete ? (
              <>
                <Trash2 className="w-4 h-4" />
                Yes, Deactivate
              </>
            ) : isResetTwoFactor ? (
              <>
                <KeyRound className="w-4 h-4" />
                Yes, Reset 2FA
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
