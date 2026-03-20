'use client';

import { Activity, Edit2, History as HistoryIcon, Layers, Loader2, Package, ShieldCheck, Trash2 } from 'lucide-react';
import type { InventoryItem } from '../api';

export function InventoryItemsTable({
  items,
  loading,
  onOpenHistory,
  onOpenUnitManagement,
  onOpenBatchManagement,
  onOpenEdit,
  onDelete,
}: {
  items: InventoryItem[];
  loading: boolean;
  onOpenHistory: (itemId: string) => void;
  onOpenUnitManagement: (itemId: string) => void;
  onOpenBatchManagement: (itemId: string) => void;
  onOpenEdit: (item: InventoryItem) => void;
  onDelete: (itemId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
            <th className="p-4 pl-6">Equipment Name</th>
            <th className="p-4">Classification</th>
            <th className="p-4">Type</th>
            <th className="p-4">Condition</th>
            <th className="p-4">Status</th>
            <th className="p-4 text-right">Available / Total</th>
            <th className="p-4 pr-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {loading ? (
            <tr>
              <td colSpan={7} className="p-12 text-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="font-medium">Loading inventory...</p>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.item_id} className="hover:bg-muted/30 transition-colors group">
                <td className="p-4 pl-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                          {item.description}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground font-mono">ID: {item.item_id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm font-medium text-muted-foreground uppercase tracking-tight">
                  {item.classification}
                </td>
                <td className="p-4 text-sm font-medium text-muted-foreground uppercase tracking-tight">
                  {item.item_type}
                </td>
                <td className="p-4">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      item.condition?.toLowerCase() === 'good'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                        : item.condition?.toLowerCase() === 'damaged'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                    }`}
                  >
                    {item.condition}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      item.status_condition?.toUpperCase() === 'AVAILABLE'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : item.status_condition?.toUpperCase() === 'LOW_STOCK'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {item.status_condition}
                  </span>
                </td>
                <td className="p-4 text-right font-medium">
                  <span className="text-foreground">{item.available_qty}</span>
                  <span className="text-muted-foreground"> / {item.total_qty}</span>
                </td>
                <td className="p-4 pr-6 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onOpenHistory(item.item_id)}
                      title="View History"
                      className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-indigo-400 transition-colors"
                      type="button"
                    >
                      <HistoryIcon className="w-4 h-4" />
                    </button>
                    {item.is_trackable && (
                      <button
                        onClick={() => onOpenUnitManagement(item.item_id)}
                        title="Manage Units"
                        className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-indigo-400 transition-colors"
                        type="button"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}
                    {!item.is_trackable && (
                      <button
                        onClick={() => onOpenBatchManagement(item.item_id)}
                        title="Manage Batches"
                        className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-indigo-400 transition-colors"
                        type="button"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onOpenEdit(item)}
                      className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-indigo-400 transition-colors"
                      type="button"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(item.item_id)}
                      className="p-2 hover:bg-rose-500/10 rounded-lg text-muted-foreground hover:text-rose-400 transition-colors"
                      type="button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={7} className="p-12 text-center text-muted-foreground font-medium">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                No items found in inventory.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

