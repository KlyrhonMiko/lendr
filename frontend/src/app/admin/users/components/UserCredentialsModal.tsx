'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import type { ReactElement } from 'react';

import type { UserCredentialReveal } from '../lib/types';

type UserCredentialsModalProps = {
  reveal: UserCredentialReveal;
  onClose: () => void;
};

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getModalCopy(source: UserCredentialReveal['source']) {
  if (source === 'create') {
    return {
      title: 'Save Generated Credentials',
      subtitle:
        'This account was created with one-time credentials. Share them securely now because they will not be shown again.',
    };
  }

  if (source === 'secondary_password') {
    return {
      title: 'Secondary Password Retrieved',
      subtitle:
        'Share this secondary password only with the intended user through a secure channel.',
    };
  }

  return {
    title: 'One-Time Login Password Reset',
    subtitle:
      'The previous password is now invalid. Share this one-time login password securely so the user can sign in and rotate it.',
  };
}

export function UserCredentialsModal({ reveal, onClose }: UserCredentialsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = useMemo(() => getModalCopy(reveal.source), [reveal.source]);
  const rotatedAtDisplay = formatTimestamp(reveal.rotatedAt);

  const handleCopy = async (fieldLabel: string, value: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setCopiedField(fieldLabel);
        toast.success(fieldLabel + ' copied');
        return;
      }
      toast.error('Clipboard is not available in this browser');
    } catch {
      toast.error('Failed to copy value');
    }
  };

  const renderCredentialBlock = (
    label: string,
    value: string,
    icon: ReactElement,
    key: string,
  ) => (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          {icon}
          {label}
        </p>
        <button
          type="button"
          onClick={() => handleCopy(label, value)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
          aria-label={'Copy ' + label}
        >
          {copiedField === label ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <code
        key={key}
        className="block w-full rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs sm:text-sm font-mono break-all text-foreground"
      >
        {value}
      </code>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl p-6 sm:p-7 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{copy.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{copy.subtitle}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 mb-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">User</p>
          <p className="text-sm font-semibold text-foreground mt-1">{reveal.userName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{reveal.userId}</p>
          {rotatedAtDisplay && (
            <p className="text-xs text-muted-foreground mt-1">Rotated at: {rotatedAtDisplay}</p>
          )}
        </div>

        <div className="space-y-3">
          {reveal.oneTimeLoginPassword &&
            renderCredentialBlock(
              'One-Time Login Password',
              reveal.oneTimeLoginPassword,
              <KeyRound className="w-4 h-4 text-primary" />,
              'one-time-login-password',
            )}

          {reveal.secondaryPassword &&
            renderCredentialBlock(
              'Secondary Password',
              reveal.secondaryPassword,
              <KeyRound className="w-4 h-4 text-primary" />,
              'secondary-password',
            )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
