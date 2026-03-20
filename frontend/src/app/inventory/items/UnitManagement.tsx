'use client';

import { useState, useEffect, useCallback } from 'react';
import { inventoryApi, ConfigRead } from './api';
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
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  
  // Configurations
  const [statusConfigs, setStatusConfigs] = useState<ConfigRead[]>([]);
  const [conditionConfigs, setConditionConfigs] = useState<ConfigRead[]>([]);

  // Filters
  const [searchSerial, setSearchSerial] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCondition, setFilterCondition] = useState('');

  const [formData, setFormData] = useState({
    serial_number: '',
    expiration_date: '',
    condition: 'good',
    description: '',
    status: 'available',
  });

  const [batchCount, setBatchCount] = useState(1);

  const fetchConfigs = useCallback(async () => {
    try {
      const [statusRes, conditionRes] = await Promise.all([
        inventoryApi.getConfigs('inventory_units_status'),
        inventoryApi.getConfigs('inventory_units_condition')
      ]);
      setStatusConfigs(statusRes.data);
      setConditionConfigs(conditionRes.data);
    } catch (err) {
      console.error('Failed to fetch configs:', err);
    }
  }, []);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listUnits(itemId, {
        serial_number: searchSerial || undefined,
        status: filterStatus || undefined,
        condition: filterCondition || undefined,
      });
      setUnits(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch units');
    } finally {
      setLoading(false);
    }
  }, [itemId, searchSerial, filterStatus, filterCondition]);

  useEffect(() => {
    fetchConfigs();
    fetchUnits();
  }, [fetchConfigs, fetchUnits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUnitId) {
        await inventoryApi.updateUnit(itemId, editingUnitId, {
          status: formData.status,
          condition: formData.condition,
          expiration_date: formData.expiration_date || undefined,
          description: formData.description || undefined,
        });
        toast.success('Unit updated successfully');
      } else if (isBatch) {
        const batch = Array.from({ length: batchCount }).map((_, i) => ({
          serial_number: `${formData.serial_number}-${i + 1}`,
          expiration_date: formData.expiration_date || undefined,
          description: formData.description || undefined,
          condition: formData.condition,
        }));
        await inventoryApi.createUnitsBatch(itemId, batch);
        toast.success(`${batchCount} units created successfully`);
      } else {
        const { status, ...rest } = formData;
        await inventoryApi.createUnit(itemId, {
          ...rest,
          expiration_date: formData.expiration_date || undefined,
          description: formData.description || undefined,
        });
        toast.success('Unit created successfully');
      }
      setIsAdding(false);
      setEditingUnitId(null);
      fetchUnits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save unit');
    }
  };

  const startEdit = (unit: any) => {
    setEditingUnitId(unit.unit_id);
    setFormData({
      serial_number: unit.serial_number || '',
      expiration_date: unit.expiration_date ? unit.expiration_date.split('T')[0] : '',
      condition: unit.condition || 'good',
      description: unit.description || '',
      status: unit.status || 'available',
    });
    setIsAdding(true);
    setIsBatch(false);
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => { 
                  setIsAdding(true); 
                  setIsBatch(false); 
                  setEditingUnitId(null); 
                  setFormData({ 
                    serial_number: '', 
                    expiration_date: '', 
                    condition: conditionConfigs[0]?.key || 'good', 
                    description: '', 
                    status: statusConfigs[0]?.key || 'available' 
                  }); 
                }}
                className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Unit
              </button>
              <button
                onClick={() => { 
                  setIsAdding(true); 
                  setIsBatch(true); 
                  setEditingUnitId(null); 
                  setFormData({ 
                    serial_number: '', 
                    expiration_date: '', 
                    condition: conditionConfigs[0]?.key || 'good', 
                    description: '', 
                    status: statusConfigs[0]?.key || 'available' 
                  }); 
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg hover:bg-muted transition-colors"
              >
                <Package className="w-4 h-4" /> Batch Add
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <input
                  type="text"
                  placeholder="Search Serial..."
                  value={searchSerial}
                  onChange={(e) => setSearchSerial(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-lg bg-muted/50 border border-border/50 text-xs focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <Loader2 className={`absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : 'hidden'}`} />
                {!loading && <Plus className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground rotate-45" />}
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 px-2 rounded-lg bg-muted/50 border border-border/50 text-[11px] font-bold uppercase transition-all"
              >
                <option value="">All Status</option>
                {statusConfigs.map(config => (
                  <option key={config.key} value={config.key}>{config.value}</option>
                ))}
              </select>
              <select
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value)}
                className="h-9 px-2 rounded-lg bg-muted/50 border border-border/50 text-[11px] font-bold uppercase transition-all"
              >
                <option value="">All Conditions</option>
                {conditionConfigs.map(config => (
                  <option key={config.key} value={config.key}>{config.value}</option>
                ))}
              </select>
            </div>
          </div>

          {isAdding && (
            <form onSubmit={handleSubmit} className="mb-8 p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={isBatch || editingUnitId ? "space-y-1" : "col-span-2 space-y-1"}>
                  <label className="text-xs font-bold uppercase text-muted-foreground">Serial {isBatch ? 'Prefix' : 'Number'}</label>
                  <input
                    required
                    disabled={!!editingUnitId}
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm disabled:opacity-50"
                    placeholder={isBatch ? "e.g. SN-2024" : "e.g. SN-001"}
                  />
                </div>
                {isBatch && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Quantity</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="100"
                      value={batchCount}
                      onChange={(e) => setBatchCount(parseInt(e.target.value) || 0)}
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
                    {conditionConfigs.map(config => (
                      <option key={config.key} value={config.key}>{config.value}</option>
                    ))}
                  </select>
                </div>
                {editingUnitId ? (
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                    >
                      {statusConfigs.map(config => (
                        <option key={config.key} value={config.key}>{config.value}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Expiration Date</label>
                    <input
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                    />
                  </div>
                )}
              </div>
              
              {editingUnitId && (
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
                  />
                </div>
              )}

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
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingUnitId(null); }}
                  className="px-4 py-2 text-sm font-semibold hover:bg-muted rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                  {editingUnitId ? 'Update Unit' : isBatch ? 'Create Batch' : 'Create Unit'}
                </button>
              </div>
            </form>
          )}
          
          <div className="max-h-[400px] overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-background/95 backdrop-blur z-10 text-xs font-bold uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 pl-4">Serial No.</th>
                  <th className="p-3">Condition / Note</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>
                ) : units.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground py-12">No units tracked for this item.</td></tr>
                ) : units.map((unit) => (
                  <tr key={unit.unit_id} className={`hover:bg-muted/30 group transition-colors ${editingUnitId === unit.unit_id ? 'bg-indigo-500/5' : ''}`}>
                    <td className="p-3 pl-4 text-sm font-mono font-semibold">{unit.serial_number}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                      <div className="capitalize">{unit.condition?.replace('_', ' ') || 'Good'}</div>
                      {unit.description && <div className="text-[10px] text-muted-foreground/70 truncate max-w-[150px]">{unit.description}</div>}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        unit.status === 'available' ? 'bg-emerald-500/10 text-emerald-500' :
                        unit.status === 'borrowed' ? 'bg-blue-500/10 text-blue-500' :
                        unit.status === 'maintenance' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-rose-500/10 text-rose-500'
                      }`}>
                        {(statusConfigs.find(c => c.key === unit.status)?.value || unit.status).toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right pr-4">
                      <div className="flex items-center justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEdit(unit)} 
                          className="p-1.5 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all" 
                          title="Edit Unit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleRetire(unit.unit_id)} 
                          className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all" 
                          title="Retire Unit"
                        >
                          <Trash2 className="w-4 h-4" />
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
