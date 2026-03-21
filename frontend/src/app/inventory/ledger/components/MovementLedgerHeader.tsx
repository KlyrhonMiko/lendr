'use client';

import { BookOpen, AlertCircle } from 'lucide-react';
import type { Anomaly } from '../lib/types';

export type MovementLedgerTab = 'ledger' | 'anomalies';

export function MovementLedgerHeader({
  activeTab,
  anomalies,
  onTabChange,
}: {
  activeTab: MovementLedgerTab;
  anomalies: Anomaly[];
  onTabChange: (tab: MovementLedgerTab) => void;
}) {
  const hasAnomalies = anomalies.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
          Inventory Ledger
        </h1>
        <p className="mt-1 text-base text-muted-foreground max-w-xl">
          View all equipment movements and stock changes in one place.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex rounded-xl border border-border bg-muted/30 p-1.5 w-fit">
          <button
            onClick={() => onTabChange('ledger')}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'ledger'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            type="button"
            aria-pressed={activeTab === 'ledger'}
          >
            <BookOpen className="w-4 h-4" aria-hidden />
            All movements
          </button>
          <button
            onClick={() => onTabChange('anomalies')}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'anomalies'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            type="button"
            aria-pressed={activeTab === 'anomalies'}
          >
            <AlertCircle className="w-4 h-4" aria-hidden />
            Issues
            {hasAnomalies && (
              <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-destructive/20 text-destructive text-xs font-semibold flex items-center justify-center">
                {anomalies.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
