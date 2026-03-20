'use client';

import { Fragment } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import type { Anomaly, LedgerMovement } from '../lib/types';

export type MovementLedgerTab = 'ledger' | 'anomalies';

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-bold font-heading">
            <th className="p-4 pl-6 text-center w-20">Type</th>
            <th className="p-4">Equipment &amp; ID</th>
            <th className="p-4">Qty Change</th>
            <th className="p-4">Movement Details</th>
            <th className="p-4">Actor</th>
            <th className="p-4 pr-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {loading ? (
            <tr>
              <td colSpan={6} className="p-16 text-center font-medium text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-500" />
                Searching records...
              </td>
            </tr>
          ) : activeTab === 'ledger' && movements.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-16 text-center text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-10" />
                No movements recorded.
              </td>
            </tr>
          ) : activeTab === 'anomalies' && anomalies.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-16 text-center text-muted-foreground">
                <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-10 text-emerald-500" />
                System reconciled. No anomalies detected.
              </td>
            </tr>
          ) : (
            rows.map((move) => {
              const anomalyKey =
                activeTab === 'anomalies'
                  ? `${(move as Anomaly).item_id}-${(move as Anomaly).anomaly_type}`
                  : null;
              const isExpanded =
                activeTab === 'anomalies' && anomalyKey
                  ? expandedAnomalyId === anomalyKey
                  : false;

              return (
                <Fragment key={(move as LedgerMovement).movement_id || anomalyKey || `${(move as any).item_id}-${(move as any).anomaly_type}`}>
                  <tr
                    onClick={() =>
                      activeTab === 'anomalies' &&
                      anomalyKey &&
                      onToggleAnomalyExpand(anomalyKey)
                    }
                    className={`hover:bg-muted/30 transition-colors group ${
                      activeTab === 'anomalies' ? 'cursor-pointer' : ''
                    } ${isExpanded ? 'bg-muted/50' : ''}`}
                  >
                    <td className="p-4 pl-6 text-center">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto relative ${
                          (move as any).is_reversed
                            ? 'bg-muted text-muted-foreground border border-border opacity-50'
                            : (move as any).qty_change > 0 ||
                              (activeTab === 'anomalies' && (move as any).details?.delta > 0)
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : (move as any).qty_change < 0 ||
                                (activeTab === 'anomalies' && (move as any).details?.delta < 0)
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}
                      >
                        {(move as any).qty_change > 0 ||
                        (activeTab === 'anomalies' && (move as any).details?.delta > 0) ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <TrendingDown className="w-5 h-5" />
                        )}
                        {(move as any).is_reversed && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-background border border-border rounded-full flex items-center justify-center">
                            <X className="w-2.5 h-2.5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground line-clamp-1">
                          {(move as any).item_name || 'System Item'}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {(move as any).inventory_id || (move as any).item_id}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col">
                        <span
                          className={`text-lg font-bold ${
                            (move as any).is_reversed
                              ? 'text-muted-foreground line-through opacity-50'
                              : (move as any).qty_change > 0 ||
                                  (activeTab === 'anomalies' && (move as any).details?.delta > 0)
                                ? 'text-emerald-500'
                                : 'text-rose-500'
                          }`}
                        >
                          {activeTab === 'anomalies' ? (
                            <>
                              {(move as any).details?.delta! > 0 ? '+' : ''}
                              {(move as any).details?.delta}
                            </>
                          ) : (
                            <>
                              {(move as any).qty_change > 0 ? '+' : ''}
                              {(move as any).qty_change}
                            </>
                          )}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-1">
                          {(move as any).movement_type === 'reversal' && (
                            <RefreshCw className="w-2 h-2" />
                          )}
                          {activeTab === 'anomalies' ? 'Balance Mismatch' : (move as any).movement_type?.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 max-w-md">
                      <div className="flex flex-col">
                        <span
                          className={`text-sm text-foreground line-clamp-1 ${
                            (move as any).is_reversed ? 'italic text-muted-foreground' : ''
                          }`}
                        >
                          {(move as any).is_reversed
                            ? `[VOIDED] ${(move as any).note || (move as any).message}`
                            : (move as any).note || (move as any).message || 'Standard transaction recorded.'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {(move as any).occurred_at || (move as any).detected_at}
                          </span>
                          {(move as any).reference_id &&
                            (move as any).movement_type === 'reversal' && (
                              <span className="text-[9px] font-mono bg-indigo-500/5 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/10">
                                Ref: {(move as any).reference_id}
                              </span>
                            )}
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="text-sm font-medium text-foreground">
                        {(move as any).actor_id || 'SYSTEM'}
                      </span>
                    </td>

                    <td className="p-4 pr-6 text-right">
                      {activeTab === 'ledger' ? (
                        <div className="flex items-center justify-end gap-2">
                          {(move as any).is_reversed && (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-500/5 text-rose-500 border border-rose-500/10 uppercase tracking-tighter">
                              Voided
                            </span>
                          )}
                          {(move as any).movement_type === 'reversal' &&
                            !(move as any).is_reversed && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-tighter">
                                Correction
                              </span>
                            )}
                          {!((move as any).is_reversed) &&
                            (move as any).movement_type !== 'reversal' && (
                              <button
                                onClick={() => onOpenReversalModal(move as LedgerMovement)}
                                className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 rounded-xl text-rose-500 transition-all"
                                title="Reverse movement"
                                type="button"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase ${
                              (move as any).severity === 'high'
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}
                          >
                            {(move as any).severity} RISK
                          </span>
                          <div className="text-muted-foreground/50 group-hover:text-rose-500 transition-colors">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>

                  {activeTab === 'anomalies' && isExpanded && (
                    <tr className="bg-muted/20 border-t border-border/50 animate-in slide-in-from-top-4 duration-300">
                      <td colSpan={6} className="p-0">
                        <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="space-y-2 p-4 rounded-2xl bg-background/50 border border-border/50 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              <BarChart3 className="w-3 h-3 text-indigo-400" />
                              Ledger Balance
                            </div>
                            <p className="text-2xl font-bold font-heading text-indigo-400">{(move as any).details?.ledger_balance}</p>
                            <p className="text-[10px] text-muted-foreground italic leading-tight">
                              Derived from transaction history
                            </p>
                          </div>

                          <div className="space-y-2 p-4 rounded-2xl bg-background/50 border border-border/50 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              <Activity className="w-3 h-3 text-emerald-400" />
                              Actual Balance
                            </div>
                            <p className="text-2xl font-bold font-heading text-emerald-400">{(move as any).details?.actual_balance}</p>
                            <p className="text-[10px] text-muted-foreground italic leading-tight">
                              Current verified on-hand quantity
                            </p>
                          </div>

                          <div className="space-y-2 p-4 rounded-2xl bg-background/50 border border-border/50 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              <AlertTriangle className={`w-3 h-3 ${(move as any).details?.delta < 0 ? 'text-rose-400' : 'text-amber-400'}`} />
                              Variance (Delta)
                            </div>
                            <p className={`text-2xl font-bold font-heading ${(move as any).details?.delta < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                              {(move as any).details?.delta > 0 ? '+' : ''}
                              {(move as any).details?.delta}
                            </p>
                            <p className="text-[10px] text-muted-foreground italic leading-tight">
                              Discrepancy needing investigation
                            </p>
                          </div>

                          <div className="space-y-2 p-4 rounded-2xl bg-background/50 border border-border/50 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              <RefreshCw className="w-3 h-3 text-blue-400" />
                              Movements
                            </div>
                            <p className="text-2xl font-bold font-heading text-blue-400">
                              {(move as any).details?.movement_count}
                            </p>
                            <p className="text-[10px] text-muted-foreground italic leading-tight">
                              Total transactions in ledger
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

