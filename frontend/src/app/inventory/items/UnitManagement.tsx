'use client';

import { useState, useEffect, useCallback } from 'react';
import { inventoryApi, ConfigRead } from './api';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Search,
  Package,
  ChevronDown,
  Check,
  Cpu,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface UnitManagementProps {
  itemId: string;
  onClose: () => void;
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const display = options.find((o) => o.key === value)?.label ?? placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className="h-9 px-3 rounded-xl bg-muted/50 border border-border text-xs font-medium cursor-pointer flex items-center gap-1.5 hover:bg-muted transition-colors"
      >
        <span className={cn('truncate', !value && 'text-muted-foreground')}>{display}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={4} className="w-44 p-1 max-h-52 overflow-y-auto">
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false); }}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors text-left',
            !value ? 'bg-indigo-500/10 text-indigo-600 font-medium' : 'hover:bg-muted'
          )}
        >
          <Check className={cn('w-3.5 h-3.5 shrink-0', !value ? 'opacity-100' : 'opacity-0')} />
          {placeholder}
        </button>
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => { onChange(opt.key); setOpen(false); }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors text-left',
              value === opt.key ? 'bg-indigo-500/10 text-indigo-600 font-medium' : 'hover:bg-muted'
            )}
          >
            <Check className={cn('w-3.5 h-3.5 shrink-0', value === opt.key ? 'opacity-100' : 'opacity-0')} />
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const display = options.find((o) => o.key === value)?.label ?? placeholder;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className="w-full h-11 px-3.5 rounded-xl bg-muted/50 border border-border text-sm font-medium cursor-pointer flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition-all"
        >
          <span className={cn('truncate text-left', !value && 'text-muted-foreground')}>{display}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-1 max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left',
                value === opt.key ? 'bg-indigo-500/10 text-indigo-600 font-medium' : 'hover:bg-muted'
              )}
            >
              <Check className={cn('w-4 h-4 shrink-0', value === opt.key ? 'opacity-100' : 'opacity-0')} />
              {opt.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  borrowed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  maintenance: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  retired: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

export function UnitManagement({ itemId, onClose }: UnitManagementProps) {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isBatch, setIsBatch] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const [statusConfigs, setStatusConfigs] = useState<ConfigRead[]>([]);
  const [conditionConfigs, setConditionConfigs] = useState<ConfigRead[]>([]);

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
        inventoryApi.getConfigs('inventory_units_condition'),
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
    } catch {
      toast.error('Failed to load units');
    } finally {
      setLoading(false);
    }
  }, [itemId, searchSerial, filterStatus, filterCondition]);

  useEffect(() => {
    fetchConfigs();
    fetchUnits();
  }, [fetchConfigs, fetchUnits]);

  const resetForm = () => {
    setFormData({
      serial_number: '',
      expiration_date: '',
      condition: conditionConfigs[0]?.key || 'good',
      description: '',
      status: statusConfigs[0]?.key || 'available',
    });
    setBatchCount(1);
  };

  const openAddForm = (batch: boolean) => {
    setIsAdding(true);
    setIsBatch(batch);
    setEditingUnitId(null);
    resetForm();
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

  const closeForm = () => {
    setIsAdding(false);
    setEditingUnitId(null);
  };

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
        toast.success('Unit updated');
      } else if (isBatch) {
        const batch = Array.from({ length: batchCount }).map((_, i) => ({
          serial_number: `${formData.serial_number}-${i + 1}`,
          expiration_date: formData.expiration_date || undefined,
          description: formData.description || undefined,
          condition: formData.condition,
        }));
        await inventoryApi.createUnitsBatch(itemId, batch);
        toast.success(`${batchCount} units created`);
      } else {
        const { status, ...rest } = formData;
        await inventoryApi.createUnit(itemId, {
          ...rest,
          expiration_date: formData.expiration_date || undefined,
          description: formData.description || undefined,
        });
        toast.success('Unit created');
      }
      closeForm();
      fetchUnits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save unit');
    }
  };

  const handleRetire = async (unitId: string) => {
    if (!confirm('Are you sure you want to retire this unit?')) return;
    try {
      await inventoryApi.retireUnit(itemId, unitId);
      toast.success('Unit retired');
      fetchUnits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to retire unit');
    }
  };

  const formTitle = editingUnitId
    ? 'Edit Unit'
    : isBatch
      ? 'Batch Add Units'
      : 'Add Unit';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <Cpu className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold font-heading">Manage Units</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Track serial numbers, condition, and availability</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search by serial number..."
                value={searchSerial}
                onChange={(e) => setSearchSerial(e.target.value)}
                className="w-full h-9 pl-8.5 pr-3 rounded-xl bg-muted/50 border border-border text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition-all"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
              )}
            </div>
            <FilterSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={statusConfigs.map((c) => ({ key: c.key, label: c.value }))}
              placeholder="All Status"
            />
            <FilterSelect
              value={filterCondition}
              onChange={setFilterCondition}
              options={conditionConfigs.map((c) => ({ key: c.key, label: c.value }))}
              placeholder="All Conditions"
            />
          </div>
        </div>

        {/* Add / Batch buttons */}
        {!isAdding && (
          <div className="px-5 pt-4 pb-1 flex items-center gap-2 shrink-0">
            <button
              onClick={() => openAddForm(false)}
              className="h-9 px-3.5 bg-indigo-500 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 hover:bg-indigo-600 active:scale-[0.98] transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Unit
            </button>
            <button
              onClick={() => openAddForm(true)}
              className="h-9 px-3.5 bg-muted text-foreground text-sm font-medium rounded-xl flex items-center gap-1.5 hover:bg-muted/80 transition-colors"
            >
              <Package className="w-4 h-4" />
              Batch Add
            </button>
          </div>
        )}

        {/* Inline Form */}
        {isAdding && (
          <div className="px-5 pt-4 pb-2 shrink-0">
            <form onSubmit={handleSubmit} className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-foreground">{formTitle}</h3>
                <button
                  type="button"
                  onClick={closeForm}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={cn('space-y-1.5', !isBatch && !editingUnitId && 'col-span-2')}>
                  <label className="block text-sm font-medium text-foreground">
                    {isBatch ? 'Serial Prefix' : 'Serial Number'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    disabled={!!editingUnitId}
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl bg-muted/50 border border-border text-sm font-medium focus:bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition-all disabled:opacity-50"
                    placeholder={isBatch ? 'e.g. SN-2024' : 'e.g. SN-001'}
                  />
                </div>
                {isBatch && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">
                      Quantity <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="100"
                      value={batchCount}
                      onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
                      className="w-full h-11 px-3.5 rounded-xl bg-muted/50 border border-border text-sm font-medium focus:bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormSelect
                  label="Condition"
                  value={formData.condition}
                  onChange={(v) => setFormData({ ...formData, condition: v })}
                  options={conditionConfigs.map((c) => ({
                    key: c.key,
                    label: c.value,
                  }))}
                  placeholder="Select condition"
                />
                {editingUnitId ? (
                  <FormSelect
                    label="Status"
                    value={formData.status}
                    onChange={(v) => setFormData({ ...formData, status: v })}
                    options={statusConfigs.map((c) => ({
                      key: c.key,
                      label: c.value,
                    }))}
                    placeholder="Select status"
                  />
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">Expiration Date</label>
                    <input
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl bg-muted/50 border border-border text-sm font-medium focus:bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition-all"
                    />
                  </div>
                )}
              </div>

              {editingUnitId && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl bg-muted/50 border border-border text-sm font-medium focus:bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition-all"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Note</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-muted/50 border border-border text-sm font-medium focus:bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition-all"
                  placeholder="Optional note about this unit..."
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 h-10 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl text-sm font-semibold bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98] transition-all shadow-sm"
                >
                  {editingUnitId ? 'Save Changes' : isBatch ? `Create ${batchCount} Units` : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Unit List */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-5 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : units.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Hash className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No units found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchSerial || filterStatus || filterCondition
                  ? 'Try adjusting your filters'
                  : 'Add your first unit to start tracking'}
              </p>
              {!isAdding && !searchSerial && !filterStatus && !filterCondition && (
                <button
                  onClick={() => openAddForm(false)}
                  className="mt-4 h-9 px-4 bg-indigo-500 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 hover:bg-indigo-600 active:scale-[0.98] transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add First Unit
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-muted/40">
                  <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5">Serial No.</th>
                    <th className="px-4 py-2.5">Condition</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {units.map((unit) => (
                    <tr
                      key={unit.unit_id}
                      className={cn(
                        'group hover:bg-muted/30 transition-colors',
                        editingUnitId === unit.unit_id && 'bg-indigo-500/5'
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-semibold">{unit.serial_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm capitalize">
                          {conditionConfigs.find((c) => c.key === unit.condition)?.value ||
                            unit.condition?.replace('_', ' ') ||
                            'Good'}
                        </span>
                        {unit.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                            {unit.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full',
                            STATUS_COLORS[unit.status] || 'bg-muted text-muted-foreground'
                          )}
                        >
                          {statusConfigs.find((c) => c.key === unit.status)?.value || unit.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(unit)}
                            className="p-1.5 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRetire(unit.unit_id)}
                            className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Retire"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
