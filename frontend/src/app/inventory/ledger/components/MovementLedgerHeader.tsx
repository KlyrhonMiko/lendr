'use client';

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
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold font-heading mb-2">Inventory Movement Ledger</h1>
        <p className="text-muted-foreground text-lg">System-wide transactional record of all equipment inflows and outflows.</p>
      </div>
      <div className="flex p-1.5 bg-muted rounded-2xl border border-border">
        <button
          onClick={() => onTabChange('ledger')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'ledger'
              ? 'bg-indigo-500 text-white shadow-lg'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          type="button"
        >
          Ledger
        </button>
        <button
          onClick={() => onTabChange('anomalies')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'anomalies'
              ? 'bg-rose-500 text-white shadow-lg'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          type="button"
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
  );
}

