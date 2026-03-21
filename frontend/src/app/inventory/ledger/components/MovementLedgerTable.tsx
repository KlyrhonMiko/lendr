'use client';

import { Fragment } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
  Undo2,
} from 'lucide-react';
import type { Anomaly, LedgerMovement } from '../lib/types';

export type MovementLedgerTab = 'ledger' | 'anomalies';

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  procurement: 'Procurement',
  manual_adjustment: 'Adjustment',
  borrow_release: 'Release',
  borrow_return: 'Return',
  damage: 'Damage / Loss',
  reversal: 'Correction',
};

function getMovementLabel(type?: string) {
  return type ? MOVEMENT_TYPE_LABELS[type] || type.replace(/_/g, ' ') : '—';
}

export function MovementLedgerTable({
  activeTab,
  loading,
  movements,
  anomalies,
  expandedAnomalyId,
  onToggleAnomalyExpand,
  onOpenReversalModal,
}: {
  activeTab: MovementLedgerTab;
  loading: boolean;
  movements: LedgerMovement[];
  anomalies: Anomaly[];
  expandedAnomalyId: string | null;
  onToggleAnomalyExpand: (id: string) => void;
  onOpenReversalModal: (movement: LedgerMovement) => void;
}) {
  const rows = activeTab === 'ledger' ? movements : anomalies;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        <p className="text-sm text-muted-foreground font-medium">Loading movements...</p>
      </div>
    );
  }

  if (activeTab === 'ledger' && movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No movements yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          When equipment is received, released, or returned, it will appear here.
        </p>
      </div>
    );
  }

  if (activeTab === 'anomalies' && anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">All good</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          No issues detected. Ledger matches actual stock.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border">
            <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equipment</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[180px]">Details</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Who</th>
            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right w-[100px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((move, idx) => {
            const anomalyKey =
              activeTab === 'anomalies'
                ? `${(move as Anomaly).item_id}-${(move as Anomaly).anomaly_type}`
                : null;
            const isExpanded =
              activeTab === 'anomalies' && anomalyKey ? expandedAnomalyId === anomalyKey : false;
            const rowKey =
              (move as LedgerMovement).movement_id || anomalyKey || `${(move as any).item_id}-${(move as any).anomaly_type}`;

            const qty =
              activeTab === 'anomalies'
                ? (move as any).details?.delta ?? 0
                : (move as any).qty_change ?? 0;
            const isIn = qty > 0;
            const isReversed = (move as any).is_reversed;

            return (
              <Fragment key={rowKey}>
                <tr
                  onClick={() =>
                    activeTab === 'anomalies' && anomalyKey && onToggleAnomalyExpand(anomalyKey)
                  }
                  className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                    activeTab === 'anomalies' ? 'cursor-pointer' : ''
                  } ${idx % 2 === 0 ? '' : 'bg-muted/10'} ${isExpanded ? 'bg-muted/30' : ''}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/8 flex items-center justify-center text-indigo-500 shrink-0">
                        <Package className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {(move as any).item_name || 'Unknown item'}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 font-mono mt-0.5">
                          {(move as any).inventory_id || (move as any).item_id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isReversed
                            ? 'bg-muted text-muted-foreground'
                            : isIn
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIn ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {activeTab === 'anomalies' ? 'Balance mismatch' : getMovementLabel((move as any).movement_type)}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        isReversed
                          ? 'text-muted-foreground line-through'
                          : isIn
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {qty > 0 ? '+' : ''}
                      {qty}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <p className="text-sm text-foreground truncate max-w-[220px]">
                      {isReversed
                        ? `[Voided] ${(move as any).note || (move as any).message || getMovementLabel((move as any).movement_type)}`
                        : (move as any).note || (move as any).message || getMovementLabel((move as any).movement_type)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(move as any).occurred_at || (move as any).detected_at}
                    </p>
                    {(move as any).reference_id && (move as any).movement_type === 'reversal' && (
                      <span className="inline-block mt-1 text-[11px] font-mono bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded">
                        Ref: {(move as any).reference_id}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {(move as any).actor_name || (move as any).user_id || 'System'}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    {activeTab === 'ledger' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        {isReversed && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            Voided
                          </span>
                        )}
                        {(move as any).movement_type === 'reversal' && !isReversed && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500">
                            Correction
                          </span>
                        )}
                        {!isReversed && (move as any).movement_type !== 'reversal' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenReversalModal(move as LedgerMovement);
                            }}
                            className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Reverse movement"
                            type="button"
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                            (move as any).severity === 'high'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {(move as any).severity}
                        </span>
                        <span className="text-muted-foreground">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>

                {activeTab === 'anomalies' && isExpanded && (
                  <tr className="bg-muted/20 border-b border-border/50">
                    <td colSpan={6} className="p-0">
                      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-background border border-border">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <BarChart3 className="w-4 h-4 text-indigo-500" />
                            Ledger balance
                          </p>
                          <p className="text-xl font-semibold text-foreground">
                            {(move as any).details?.ledger_balance}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-background border border-border">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            Actual balance
                          </p>
                          <p className="text-xl font-semibold text-foreground">
                            {(move as any).details?.actual_balance}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-background border border-border">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Difference
                          </p>
                          <p
                            className={`text-xl font-semibold ${
                              (move as any).details?.delta < 0 ? 'text-rose-600' : 'text-amber-600'
                            }`}
                          >
                            {(move as any).details?.delta > 0 ? '+' : ''}
                            {(move as any).details?.delta}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-background border border-border">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <RefreshCw className="w-4 h-4 text-blue-500" />
                            Transactions
                          </p>
                          <p className="text-xl font-semibold text-foreground">
                            {(move as any).details?.movement_count}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
