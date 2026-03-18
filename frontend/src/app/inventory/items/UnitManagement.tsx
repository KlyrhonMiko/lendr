'use client';

import { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from './api';
import { X, Plus, Trash2, Edit2, Loader2, AlertCircle, Package, History } from 'lucide-react';
import { toast } from 'sonner';

interface UnitManagementProps {
  itemId: string;
  onClose: () => void;
}

export function UnitManagement({ itemId, onClose }: UnitManagementProps) {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isBatch, setIsBatch] = useState(false);

  const [formData, setFormData] = useState({
    serial_number: '',
    internal_ref: '',
    expiration_date: '',
    condition: 'good',
    description: '',
  });

  const [batchCount, setBatchCount] = useState(1);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listUnits(itemId);
      setUnits(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch units');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isBatch) {
        const batch = Array.from({ length: batchCount }).map((_, i) => ({
          serial_number: `${formData.serial_number}-${i + 1}`,
          internal_ref: formData.internal_ref ? `${formData.internal_ref}-${i + 1}` : undefined,
          expiration_date: formData.expiration_date || undefined,
          description: formData.description || undefined,
        }));
        await inventoryApi.createUnitsBatch(itemId, batch);
        toast.success(`${batchCount} units created successfully`);
      } else {
        const cleanedData = {
          ...formData,
          expiration_date: formData.expiration_date || undefined,
          description: formData.description || undefined,
        };
        await inventoryApi.createUnit(itemId, cleanedData);
        toast.success('Unit created successfully');
      }
      setIsAdding(false);
      fetchUnits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create unit');
    }
  };

  const handleRetire = async (unitId: string) => {
    if (!confirm('Are you sure you want to retire this unit?')) return;
    try {
      await inventoryApi.retireUnit(itemId, unitId);
      toast.success('Unit retired successfully');
      fetchUnits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to retire unit');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-xl font-bold font-heading">Manage Individual Units</h2>
            <p className="text-sm text-muted-foreground">Trackable serial numbers and health status.</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => { setIsAdding(true); setIsBatch(false); }}
                className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Unit
              </button>
              <button
                onClick={() => { setIsAdding(true); setIsBatch(true); }}
                className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-semibold rounded-xl flex items-center gap-2 border border-border"
              >
                <Package className="w-4 h-4" /> Batch Add
              </button>
            </div>
          </div>

          {isAdding && (
            <form onSubmit={handleCreate} className="mb-8 p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Serial Prefix</label>
                  <input
                    required
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                  />
                </div>
                {isBatch ? (
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Quantity</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="100"
                      value={batchCount}
                      onChange={(e) => setBatchCount(parseInt(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Internal Ref</label>
                    <input
                      type="text"
                      value={formData.internal_ref}
                      onChange={(e) => setFormData({ ...formData, internal_ref: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                  >
                    <option value="brand_new">Brand New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                  placeholder="Note about this unit..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-semibold hover:bg-muted rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg">Create</button>
              </div>
            </form>
          )}

          <div className="max-h-[400px] overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-background/95 backdrop-blur z-10 text-xs font-bold uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 pl-4">Serial No.</th>
                  <th className="p-3">Ref / Note</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>
                ) : units.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No units tracked for this item.</td></tr>
                ) : units.map((unit) => (
                  <tr key={unit.unit_id} className="hover:bg-muted/30 group">
                    <td className="p-3 pl-4 text-sm font-mono font-semibold">{unit.serial_number}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                      <div>{unit.internal_ref || '---'}</div>
                      {unit.description && <div className="text-[10px] text-muted-foreground/70 truncate max-w-[150px]">{unit.description}</div>}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        unit.status === 'available' ? 'bg-emerald-500/10 text-emerald-500' :
                        unit.status === 'borrowed' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-rose-500/10 text-rose-500'
                      }`}>
                        {unit.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleRetire(unit.unit_id)} className="p-1.5 text-muted-foreground hover:text-rose-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
