'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Package, Tag, Building2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { FormSelect } from '@/components/ui/form-select';
import { userApi, User } from '../users/api';
import { inventoryApi, InventoryItem, InventoryUnit } from '../../inventory/items/api';

import { SearchableSelect } from '@/components/ui/searchable-select';

interface AssignEntrustedItemModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function AssignEntrustedItemModal({
    onClose,
    onSuccess,
}: AssignEntrustedItemModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetchingBaseData, setFetchingBaseData] = useState(true);

    // Data
    const [users, setUsers] = useState<User[]>([]);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [units, setUnits] = useState<InventoryUnit[]>([]);
    const [fetchingUnits, setFetchingUnits] = useState(false);

    // Form State
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        const fetchBaseData = async () => {
            try {
                setFetchingBaseData(true);
                const [usersRes, itemsRes] = await Promise.all([
                    userApi.list({ per_page: 500 }), // Get all users
                    inventoryApi.list({ is_trackable: true, per_page: 500 }) // Get trackable items
                ]);
                setUsers(usersRes.data);
                setItems(itemsRes.data);
            } catch {
                toast.error('Failed to load base assignment data');
            } finally {
                setFetchingBaseData(false);
            }
        };
        fetchBaseData();
    }, []);

    useEffect(() => {
        if (!selectedItemId) {
            setUnits([]);
            setSelectedUnitId('');
            return;
        }

        const fetchUnits = async () => {
            setFetchingUnits(true);
            try {
                const res = await inventoryApi.listUnits(selectedItemId, { status: 'available', per_page: 500 });
                setUnits(res.data);
                if (res.data.length > 0) {
                    setSelectedUnitId(res.data[0].unit_id);
                } else {
                    setSelectedUnitId('');
                }
            } catch {
                toast.error('Failed to load available units');
            } finally {
                setFetchingUnits(false);
            }
        };
        fetchUnits();
    }, [selectedItemId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId || !selectedUnitId) return;

        setLoading(true);
        try {
            await userApi.assignEntrustedItem(selectedUserId, {
                unit_id: selectedUnitId,
                user_id: selectedUserId,
                notes: notes,
            });
            toast.success('Entrusted item assigned successfully');
            onSuccess();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to assign item');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div
                className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-muted/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Tag className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-foreground">
                                Assign Entrusted Item
                            </h2>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Select an employee and specific equipment to entrust
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-background/50">
                    <div className="p-8 space-y-6">
                        {fetchingBaseData ? (
                            <div className="py-12 flex flex-col items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">Loading selection data...</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4 p-5 rounded-xl border border-border/60 bg-muted/20">
                                    <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <UserCircle className="w-4 h-4 text-primary" />
                                        Assignment Details
                                    </h3>

                                    <SearchableSelect
                                        label="Select Employee"
                                        required
                                        value={selectedUserId}
                                        onChange={setSelectedUserId}
                                        options={users.map(u => ({ key: u.user_id, label: `${u.first_name} ${u.last_name} (${u.employee_id || u.username})` }))}
                                        placeholder="Choose an employee..."
                                    />

                                    <SearchableSelect
                                        label="Inventory Item Categories"
                                        required
                                        value={selectedItemId}
                                        onChange={setSelectedItemId}
                                        options={items.map(i => ({ key: i.item_id, label: `${i.name} (Available: ${i.available_qty})` }))}
                                        placeholder="Choose an item type..."
                                    />

                                    <div className="relative">
                                        <FormSelect
                                            label="Specific Unit"
                                            required
                                            disabled={!selectedItemId || fetchingUnits || units.length === 0}
                                            value={selectedUnitId}
                                            onChange={setSelectedUnitId}
                                            options={units.map(u => ({ key: u.unit_id, label: u.serial_number || u.unit_id }))}
                                            placeholder={!selectedItemId ? "Select an item first..." : fetchingUnits ? "Loading units..." : units.length === 0 ? "No available units" : "Choose a unit..."}
                                        />
                                        {fetchingUnits && (
                                            <Loader2 className="absolute right-10 bottom-3 w-4 h-4 animate-spin text-muted-foreground z-10" />
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">
                                            Notes / Remarks
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full p-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground/40 min-h-[80px] resize-none"
                                            placeholder="Optional rules or remarks to accompany the assignment..."
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-4 px-8 py-6 border-t border-border bg-muted/30">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-xl border border-border bg-background text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || fetchingBaseData || !selectedUserId || !selectedUnitId}
                            className="flex-[2] h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                'Confirm Assignment'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
