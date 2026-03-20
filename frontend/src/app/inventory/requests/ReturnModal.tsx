'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Undo2, AlertCircle, ChevronDown, Check } from 'lucide-react';
import { borrowApi, BorrowRequest, BorrowRequestUnit, BorrowUnitReturn } from './api';
import { inventoryApi, ConfigRead } from '../items/api';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReturnModalProps {
  request: BorrowRequest;
  onClose: () => void;
  onSuccess: () => void;
}

interface UnitReturnState {
  unit_id: string;
  serial_number?: string;
  condition: string;
  notes: string;
}

export function ReturnModal({ request, onClose, onSuccess }: ReturnModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assignedUnits, setAssignedUnits] = useState<BorrowRequestUnit[]>([]);
  const [conditions, setConditions] = useState<ConfigRead[]>([]);
  const [unitReturns, setUnitReturns] = useState<UnitReturnState[]>([]);
  const [globalNotes, setGlobalNotes] = useState('');
  const [globalCondition, setGlobalCondition] = useState('');
  const [globalConditionOpen, setGlobalConditionOpen] = useState(false);
  const [openConditionUnit, setOpenConditionUnit] = useState<string | null>(null);

  const hasTrackableItems = request.items.some(item => (item as any).is_trackable);

  const conditionStyle = (condition: string) => {
    if (!condition) return 'bg-muted/40 border-border text-muted-foreground';
    if (condition === 'good' || condition === 'excellent') return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500';
    if (condition === 'fair') return 'bg-amber-500/10 border-amber-500/30 text-amber-500';
    return 'bg-rose-500/10 border-rose-500/30 text-rose-500';
  };

  const conditionLabel = (key: string) => {
    if (!key) return 'No change';
    return conditions.find(c => c.key === key)?.value || key;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [unitsRes, conditionsRes] = await Promise.all([
          borrowApi.getAssignedUnits(request.request_id),
          inventoryApi.getConfigs('inventory_units_condition'),
        ]);

        const units = (unitsRes.data as BorrowRequestUnit[]).filter(u => !u.returned_at);
        setAssignedUnits(units);
        setConditions(conditionsRes.data as ConfigRead[]);

        setUnitReturns(units.map(u => ({
          unit_id: u.unit_id,
          serial_number: u.serial_number,
          condition: '',
          notes: '',
        })));
      } catch (err) {
        console.error('Failed to load return data:', err);
        toast.error('Failed to load assigned units');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [request.request_id]);

  const updateUnitReturn = (unitId: string, field: 'condition' | 'notes', value: string) => {
    setUnitReturns(prev => prev.map(u =>
      u.unit_id === unitId ? { ...u, [field]: value } : u
    ));
  };

  const applyGlobalCondition = () => {
    if (!globalCondition) return;
    setUnitReturns(prev => prev.map(u => ({ ...u, condition: globalCondition })));
    toast.success(`Set all units to "${globalCondition}"`);
  };

  const getStatusFromCondition = (condition: string): string | undefined => {
    const maintenanceConditions = ['damaged', 'for_repair', 'repair', 'poor'];
    if (maintenanceConditions.includes(condition.toLowerCase())) {
      return 'maintenance';
    }
    return undefined;
  };

  const handleReturn = async () => {
    setSubmitting(true);
    try {
      const unit_returns: BorrowUnitReturn[] = unitReturns.map(u => ({
        unit_id: u.unit_id,
        condition: u.condition || undefined,
        notes: u.notes || undefined,
        status_on_return: u.condition ? getStatusFromCondition(u.condition) : undefined,
      }));

      const hasUnitData = unit_returns.some(u => u.condition || u.notes);
      await borrowApi.return(request.request_id, {
        notes: globalNotes || undefined,
        unit_returns: hasUnitData ? unit_returns : undefined,
      });

      toast.success('Items returned successfully');
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to return items';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
              <Undo2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading uppercase tracking-tight">Return Items</h2>
              <p className="text-sm text-muted-foreground font-medium">
                Request: <span className="text-indigo-400 font-mono">{request.request_id}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs text-muted-foreground mt-2 font-medium">Loading assigned units...</p>
            </div>
          ) : (
            <>
              {hasTrackableItems && assignedUnits.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Unit Conditions</h3>
                    {assignedUnits.length > 1 && conditions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Set all:</span>
                        <Popover open={globalConditionOpen} onOpenChange={setGlobalConditionOpen}>
                          <PopoverTrigger
                            type="button"
                            className={cn(
                              "relative h-8 pl-3 pr-7 rounded-lg border text-xs font-bold text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all cursor-pointer",
                              conditionStyle(globalCondition)
                            )}
                          >
                            <span className="block truncate">{conditionLabel(globalCondition) || 'Select...'}</span>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                          </PopoverTrigger>
                          <PopoverContent align="end" sideOffset={4} className="w-44 p-1 max-h-60 overflow-y-auto">
                            {conditions.map(c => (
                              <button
                                key={c.key}
                                type="button"
                                onClick={() => {
                                  setGlobalCondition(c.key);
                                  setGlobalConditionOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors text-left",
                                  globalCondition === c.key
                                    ? "bg-indigo-500/10 text-indigo-500 font-bold"
                                    : "hover:bg-muted text-foreground"
                                )}
                              >
                                <Check className={cn("w-3.5 h-3.5 shrink-0", globalCondition === c.key ? "opacity-100" : "opacity-0")} />
                                {c.value}
                              </button>
                            ))}
                          </PopoverContent>
                        </Popover>
                        <button
                          onClick={applyGlobalCondition}
                          disabled={!globalCondition}
                          className="h-8 px-3 rounded-lg bg-indigo-500/10 text-indigo-500 text-[10px] font-bold hover:bg-indigo-500/20 disabled:opacity-50 transition-colors uppercase tracking-wider"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {unitReturns.map((unitReturn) => (
                      <div
                        key={unitReturn.unit_id}
                        className="p-4 rounded-2xl border border-border bg-background/50 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold font-mono text-foreground">{unitReturn.unit_id}</span>
                            {unitReturn.serial_number && (
                              <span className="ml-2 text-xs text-muted-foreground font-medium">
                                SN: {unitReturn.serial_number}
                              </span>
                            )}
                          </div>
                          {conditions.length > 0 ? (
                            <Popover
                              open={openConditionUnit === unitReturn.unit_id}
                              onOpenChange={(open) => setOpenConditionUnit(open ? unitReturn.unit_id : null)}
                            >
                              <PopoverTrigger
                                type="button"
                                className={cn(
                                  "relative h-9 pl-3 pr-8 rounded-xl border text-xs font-bold text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all cursor-pointer min-w-[120px]",
                                  conditionStyle(unitReturn.condition)
                                )}
                              >
                                <span className="block truncate">{conditionLabel(unitReturn.condition)}</span>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                              </PopoverTrigger>
                              <PopoverContent align="end" sideOffset={4} className="w-44 p-1 max-h-60 overflow-y-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateUnitReturn(unitReturn.unit_id, 'condition', '');
                                    setOpenConditionUnit(null);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors text-left",
                                    !unitReturn.condition
                                      ? "bg-indigo-500/10 text-indigo-500 font-bold"
                                      : "hover:bg-muted text-muted-foreground"
                                  )}
                                >
                                  <Check className={cn("w-3.5 h-3.5 shrink-0", !unitReturn.condition ? "opacity-100" : "opacity-0")} />
                                  No change
                                </button>
                                {conditions.map(c => (
                                  <button
                                    key={c.key}
                                    type="button"
                                    onClick={() => {
                                      updateUnitReturn(unitReturn.unit_id, 'condition', c.key);
                                      setOpenConditionUnit(null);
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors text-left",
                                      unitReturn.condition === c.key
                                        ? "bg-indigo-500/10 text-indigo-500 font-bold"
                                        : "hover:bg-muted text-foreground"
                                    )}
                                  >
                                    <Check className={cn("w-3.5 h-3.5 shrink-0", unitReturn.condition === c.key ? "opacity-100" : "opacity-0")} />
                                    {c.value}
                                  </button>
                                ))}
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <input
                              type="text"
                              value={unitReturn.condition}
                              onChange={(e) => updateUnitReturn(unitReturn.unit_id, 'condition', e.target.value)}
                              placeholder="Condition (optional)"
                              className="h-9 w-36 px-3 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-xs font-medium"
                            />
                          )}
                        </div>
                        <input
                          type="text"
                          value={unitReturn.notes}
                          onChange={(e) => updateUnitReturn(unitReturn.unit_id, 'notes', e.target.value)}
                          placeholder="Notes for this unit (optional)..."
                          className="w-full h-9 px-3 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-xs font-medium"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasTrackableItems && (
                <div className="p-4 bg-muted/20 rounded-2xl border border-dashed border-border/50 text-center">
                  <p className="text-sm text-muted-foreground font-medium">
                    This request contains non-trackable items. Stock will be restored automatically upon return.
                  </p>
                </div>
              )}

              {hasTrackableItems && assignedUnits.length === 0 && (
                <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center gap-3 text-amber-500 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>No unreturned units found for this request.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-border/50 bg-background/50 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Return Notes (Optional)</label>
            <textarea
              value={globalNotes}
              onChange={(e) => setGlobalNotes(e.target.value)}
              placeholder="General notes about this return..."
              className="w-full h-20 p-3 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium resize-none shadow-inner"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl border border-border font-bold text-sm hover:bg-muted/50 transition-all uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              disabled={submitting || loading}
              onClick={handleReturn}
              className="flex-1 h-12 rounded-2xl bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Return'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
