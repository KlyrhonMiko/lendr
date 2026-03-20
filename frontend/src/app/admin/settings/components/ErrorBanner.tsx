'use client';

import { AlertCircle } from 'lucide-react';

export function ErrorBanner({ error }: { error: string }) {
  return (
    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
      <AlertCircle className="w-4 h-4" />
      <p>{error}</p>
    </div>
  );
}

