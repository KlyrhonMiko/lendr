'use client';

import { useState, useEffect, useCallback } from 'react';
import { inventoryApi, InventoryBatch, ConfigRead, StockAdjustmentPayload } from './api';
import { X, Plus, Edit2, Loader2, AlertCircle, Layers, History, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

interface BatchManagementProps {
  itemId: string;
  onClose: () => void;
}

export function BatchManagement({ itemId, onClose }: BatchManagementProps) {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingBatch, setEditingBatch] = useState<InventoryBatch | null>(null);
  const [isAdjusting, setIsAdjusting] = useState<InventoryBatch | null>(null);
  const [isReduction, setIsReduction] = useState(false);

  const [formData, setFormData] = useState({
    expiration_date: '',
    description: '',
  });

  const [adjustData, setAdjustData] = useState<StockAdjustmentPayload>({
    qty_change: 0,
    movement_type: 'procurement',
    reason_code: '',
    note: '',
  });

  const [movementTypes, setMovementTypes] = useState<ConfigRead[]>([]);
  const [reasonCodes, setReasonCodes] = useState<ConfigRead[]>([]);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listBatches(itemId);
      setBatches(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  const fetchConfigs = useCallback(async () => {
    try {
      const [moveRes, reasonRes] = await Promise.all([
        inventoryApi.getConfigs('inventory_movements_movement_type'),
        inventoryApi.getConfigs('inventory_movements_reason_code'),
      ]);
      setMovementTypes(moveRes.data);
      setReasonCodes(reasonRes.data);
    } catch (err) {
      console.error('Failed to fetch movement configs', err);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
    fetchConfigs();
  }, [fetchBatches, fetchConfigs]);

  const resetForms = useCallback(() => {
    setIsAdding(false);
    setEditingBatch(null);
    setIsAdjusting(null);
    setIsReduction(false);
    setFormData({ expiration_date: '', description: '' });
    setAdjustData({
      qty_change: 0,
      movement_type: 'procurement',
      reason_code: '',
      note: '',
    });
  }, []);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        expiration_date: formData.expiration_date || undefined,
        description: formData.description || undefined,
      };

      if (editingBatch) {
        await inventoryApi.updateBatch(itemId, editingBatch.batch_id, payload);
        toast.success('Batch metadata updated');
      } else {
        await inventoryApi.createBatch(itemId, payload);
        toast.success('New batch created');
      }
      resetForms();
      fetchBatches();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdjusting) return;

    try {
      const finalQty = isReduction ? -Math.abs(adjustData.qty_change) : Math.abs(adjustData.qty_change);
      
      await inventoryApi.adjustStock(itemId, {
        ...adjustData,
        qty_change: finalQty,
        batch_id: isAdjusting.batch_id,
      });
      toast.success('Stock adjusted successfully');
      resetForms();
      fetchBatches();
    } catch (err: any) {
      toast.error(err.message || 'Adjustment failed');
    }
  };

  const openNewBatch = () => {
    resetForms();
    setIsAdding(true);
  };

  const openEdit = (batch: InventoryBatch) => {
    resetForms();
    setEditingBatch(batch);
    setFormData({
      expiration_date: batch.expiration_date ? batch.expiration_date.split('T')[0] : '',
      description: batch.description || '',
    });
    setIsAdding(true);
  };

  const openAdjust = (batch: InventoryBatch) => {
    resetForms();
    setIsAdjusting(batch);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-xl font-bold font-heading">Batch Management</h2>
            <p className="text-sm text-muted-foreground">Manage groups and expiration for untrackable stock.</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!isAdding && !isAdjusting && (
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={openNewBatch}
                className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> New Batch
              </button>
            </div>
          )}

          {isAdding && (
            <form onSubmit={handleCreateOrUpdate} className="mb-8 p-6 bg-muted/30 rounded-2xl border border-border/50 space-y-4">
              <h3 className="font-bold text-sm uppercase text-indigo-400">{editingBatch ? 'Edit Batch Metadata' : 'Create New Batch'}</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                    placeholder="Batch description..."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForms} className="px-4 py-2 text-sm font-semibold hover:bg-muted rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg">
                  {editingBatch ? 'Save Changes' : 'Create Batch'}
                </button>
              </div>
            </form>
          )}

          {isAdjusting && (
            <form onSubmit={handleAdjustStock} className="mb-8 p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 space-y-4">
              <h3 className="font-bold text-sm uppercase text-indigo-400">Inventory Adjustment: {isAdjusting.batch_id}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Action</label>
                  <div className="flex bg-background border border-border rounded-lg p-1 h-10">
                    <button
                      type="button"
                      onClick={() => setIsReduction(false)}
                      className={`flex-1 flex items-center justify-center gap-1 rounded-md text-xs font-bold transition-colors ${!isReduction ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> IN
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsReduction(true)}
                      className={`flex-1 flex items-center justify-center gap-1 rounded-md text-xs font-bold transition-colors ${isReduction ? 'bg-rose-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                    >
                      <TrendingDown className="w-3.5 h-3.5" /> OUT
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Quantity</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={adjustData.qty_change === 0 ? '' : Math.abs(adjustData.qty_change)}
                    onChange={(e) => setAdjustData({ ...adjustData, qty_change: parseInt(e.target.value) || 0 })}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Type</label>
                  <select
                    value={adjustData.movement_type}
                    onChange={(e) => setAdjustData({ ...adjustData, movement_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                  >
                    {movementTypes.map(m => <option key={m.key} value={m.key}>{m.value}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Reason</label>
                  <select
                    value={adjustData.reason_code}
                    onChange={(e) => setAdjustData({ ...adjustData, reason_code: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                  >
                    <option value="">Select Reason</option>
                    {reasonCodes.map(r => <option key={r.key} value={r.key}>{r.value}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Adjustment Note</label>
                <textarea
                  required
                  value={adjustData.note}
                  onChange={(e) => setAdjustData({ ...adjustData, note: e.target.value })}
                  className="w-full h-20 p-3 rounded-lg bg-background border border-border text-sm resize-none"
                  placeholder="Reason for this change..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForms} className="px-4 py-2 text-sm font-semibold hover:bg-muted rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2">
                  Submit Adjustment
                </button>
              </div>
            </form>
          )}

          <div className="max-h-[350px] overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-background/95 backdrop-blur z-10 text-xs font-bold uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 pl-4">Batch ID</th>
                  <th className="p-3">Available / Total</th>
                  <th className="p-3">Expires</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>
                ) : batches.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No batches created for this item.</td></tr>
                ) : batches.map((batch) => (
                  <tr key={batch.batch_id} className="hover:bg-muted/30 group">
                    <td className="p-3 pl-4 text-sm font-mono font-semibold">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <div>
                          <div>{batch.batch_id}</div>
                          {batch.description && <div className="text-[10px] text-muted-foreground/70 font-sans font-normal truncate max-w-[120px]">{batch.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      <span className="font-bold text-foreground">{batch.available_qty}</span>
                      <span className="text-muted-foreground"> / {batch.total_qty}</span>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : 'No expiry'}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        batch.status === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                        batch.status === 'low_stock' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        batch.status === 'out_of_stock' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                        batch.status === 'near_expiry' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                        batch.status === 'expired' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-500'
                      }`}>
                        {batch.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right pr-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openAdjust(batch)} title="Adjust Stock" className="p-1.5 hover:bg-indigo-500/10 text-indigo-400 rounded-lg">
                          <History className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(batch)} title="Edit Metadata" className="p-1.5 hover:bg-secondary text-muted-foreground rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
