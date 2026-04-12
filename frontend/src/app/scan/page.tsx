'use client';

import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Package, ArrowLeft, Loader2, RefreshCw, User, MapPin, Calendar, Info, History, QrCode, CheckCircle2, AlertCircle, Clock, Layers, Trash2, Scan, X } from 'lucide-react';
import Link from 'next/link';
import { inventoryApi, InventoryItem, InventoryUnit, PublicActiveBorrow, PublicBorrowHistory } from '@/app/inventory/items/api';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function ScanPage() {
    const [scannedData, setScannedData] = useState<{ type: string; id: string; itemId?: string } | null>(null);
    const [item, setItem] = useState<InventoryItem | null>(null);
    const [unit, setUnit] = useState<InventoryUnit | null>(null);
    const [loading, setLoading] = useState(false);
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [batchItems, setBatchItems] = useState<Array<{
        id: string;
        type: string;
        itemId?: string;
        item?: InventoryItem;
        unit?: InventoryUnit;
        loading?: boolean;
        timestamp: number;
    }>>([]);
    const [isShowingBatchSummary, setIsShowingBatchSummary] = useState(false);
    const [expandedHistoryItems, setExpandedHistoryItems] = useState<Record<string, boolean>>({});

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        try {
            return new Intl.DateTimeFormat('en-PH', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(new Date(dateStr));
        } catch (e) {
            return dateStr;
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleScan = (result: any) => {
        if (!isBatchMode && scannedData) return;

        let text = '';
        if (Array.isArray(result) && result.length > 0) {
            text = result[0]?.rawValue || '';
        } else {
            text = result?.text || result?.rawValue || result || '';
        }

        if (!text || typeof text !== 'string') return;

        try {
            const data = JSON.parse(text);
            if (data.type && data.id) {
                if (isBatchMode) {
                    // Check if already in batch to prevent rapid double-scans
                    setBatchItems(prev => {
                        const exists = prev.find(item => item.id === data.id && item.type === data.type);
                        if (exists) {
                            // If it exists but was scanned more than 2 seconds ago, we could allow it or just ignore
                            // For inventory, usually we just want to know it's there once in a session
                            return prev;
                        }

                        const newItem = {
                            ...data,
                            loading: true,
                            timestamp: Date.now()
                        };

                        // Fetch details for this new item in the batch
                        fetchBatchItemDetails(newItem);

                        return [newItem, ...prev];
                    });
                    toast.success(`Scanned ${data.type}`);
                } else {
                    setScannedData(data);
                }
            } else {
                toast.error('Invalid QR Code format');
            }
        } catch {
            toast.error('Unrecognized QR Code');
        }
    };

    const fetchBatchItemDetails = async (batchItem: { id: string; type: string; itemId?: string }) => {
        try {
            if (batchItem.type === 'item') {
                const res = await inventoryApi.getPublic(batchItem.id);
                setBatchItems(prev => prev.map(item =>
                    item.id === batchItem.id && item.type === 'item'
                        ? { ...item, item: res.data, loading: false }
                        : item
                ));
            } else if (batchItem.type === 'unit' && batchItem.itemId) {
                const [itemRes, unitsRes] = await Promise.all([
                    inventoryApi.getPublic(batchItem.itemId),
                    inventoryApi.listPublicUnits(batchItem.itemId)
                ]);
                const foundUnit = unitsRes.data.find(u => u.unit_id === batchItem.id);
                setBatchItems(prev => prev.map(item =>
                    item.id === batchItem.id && item.type === 'unit'
                        ? { ...item, item: itemRes.data, unit: foundUnit, loading: false }
                        : item
                ));
            }
        } catch (error) {
            console.error('Failed to fetch batch item details', error);
            setBatchItems(prev => prev.map(item =>
                item.id === batchItem.id && item.type === batchItem.type
                    ? { ...item, loading: false }
                    : item
            ));
        }
    };

    useEffect(() => {
        if (scannedData?.type === 'item' && scannedData.id) {
            setLoading(true);
            inventoryApi.getPublic(scannedData.id)
                .then(res => {
                    setItem(res.data);
                    setUnit(null);
                    setLoading(false);
                })
                .catch((error) => {
                    if (error?.status !== 401) {
                        toast.error('Equipment not found');
                        setLoading(false);
                    }
                });
        } else if (scannedData?.type === 'unit' && scannedData.itemId && scannedData.id) {
            setLoading(true);
            Promise.all([
                inventoryApi.getPublic(scannedData.itemId),
                inventoryApi.listPublicUnits(scannedData.itemId)
            ]).then(([itemRes, unitsRes]) => {
                setItem(itemRes.data);
                const foundUnit = unitsRes.data.find(u => u.unit_id === scannedData.id);
                if (foundUnit) setUnit(foundUnit);
                setLoading(false);
            }).catch((error) => {
                if (error?.status !== 401) {
                    toast.error('Unit or Equipment not found');
                    setLoading(false);
                }
            });
        }
    }, [scannedData]);

    const getStatusConfig = (status?: string) => {
        const s = status?.toLowerCase() || '';
        if (s === 'available' || s === 'healthy') {
            return { label: 'Available', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 };
        }
        if (s === 'borrowed' || s === 'in_use') {
            return { label: 'In Use', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', icon: Clock };

        }
        return { label: status?.replace(/_/g, ' ') || 'Unknown', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: AlertCircle };
    };

    const renderActiveBorrow = (borrow: PublicActiveBorrow) => (
        <div className="mt-5 rounded-2xl overflow-hidden border border-amber-500/25 bg-amber-500/8 dark:bg-amber-500/10">
            <div className="px-4 py-3 bg-amber-500/15 border-b border-amber-500/20 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center">
                    <Clock className="w-3 h-3 text-primary" />

                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Currently Borrowed</span>
            </div>
            <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700/60 dark:text-amber-400/60">Borrower</p>
                        <p className="text-sm font-bold text-primary dark:text-primary-foreground">
                            {borrow.borrower_name}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {borrow.location_name && (
                        <div className="flex items-start gap-2 bg-amber-500/10 rounded-xl p-2.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-600/70 dark:text-amber-400/70 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[9px] uppercase font-bold text-amber-700/60 dark:text-amber-400/60 tracking-wider">Location</p>
                                <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">{borrow.location_name}</p>
                            </div>
                        </div>
                    )}
                    {borrow.return_at && (
                        <div className="flex items-start gap-2 bg-amber-500/10 rounded-xl p-2.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-600/70 dark:text-amber-400/70 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[9px] uppercase font-bold text-amber-700/60 dark:text-amber-400/60 tracking-wider">Due</p>
                                <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">{formatDate(borrow.return_at)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderBorrowHistory = (history: PublicBorrowHistory[]) => (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2.5 bg-muted/30">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <History className="w-3.5 h-3.5 text-primary" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/70">Borrow History</h3>
            </div>
            <div className="divide-y divide-border/50">
                {history.length > 0 ? history.map((h, i) => (
                    <div key={i} className="flex justify-between items-center px-5 py-3.5 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">{h.borrower_name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">{h.location_name || 'General'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-medium text-foreground/80">{formatDate(h.returned_at)}</p>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Returned</p>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                            <History className="w-5 h-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">No past records found</p>
                    </div>
                )}
            </div>
        </div>
    );

    const rawStatus = unit ? unit.status : item?.status_condition;
    const statusConfig = getStatusConfig(rawStatus);
    const StatusIcon = statusConfig.icon;

    return (
        <div className="min-h-screen bg-background flex flex-col">

            {/* Header */}
            <div className="shrink-0 px-4 pt-5 pb-4 flex items-center gap-3">
                {scannedData ? (
                    <button
                        onClick={() => { setScannedData(null); setItem(null); setUnit(null); }}
                        className="w-9 h-9 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                ) : (
                    <Link
                        href="/inventory"
                        className="w-9 h-9 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                )}
                <div className="flex-1">
                    <h1 className="text-lg font-bold font-heading leading-tight">QR Scanner</h1>
                    <p className="text-xs text-muted-foreground">Lendr Equipment Lookup</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsBatchMode(!isBatchMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${isBatchMode
                            ? 'bg-primary/10 border-primary/30 text-primary font-bold'
                            : 'bg-muted/40 border-border/50 text-muted-foreground'
                            }`}
                    >
                        <Layers className={`w-4 h-4 ${isBatchMode ? 'animate-pulse' : ''}`} />
                        <span className="text-[11px] uppercase tracking-wider">Batch</span>
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <QrCode className="w-4 h-4 text-primary" />
                    </div>
                </div>
            </div>

            <div className="flex-1 px-4 pb-6 flex flex-col min-h-0">
                {isShowingBatchSummary ? (
                    /* Batch Summary View */
                    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl flex flex-col h-full">
                            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-muted/30">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold font-heading">Batch Summary</h3>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{batchItems.length} items scanned</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsShowingBatchSummary(false)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {batchItems.map((bi) => {
                                    const itemStatus = bi.unit ? bi.unit.status : bi.item?.status_condition;
                                    const config = getStatusConfig(itemStatus);
                                    const Icon = config.icon;

                                    return (
                                        <div key={`${bi.type}-${bi.id}`} className="p-4 rounded-2xl border border-border/50 bg-muted/20 flex flex-col gap-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-card border border-border/40 flex items-center justify-center shrink-0">
                                                        <Package className="w-5 h-5 text-muted-foreground/70" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold truncate">
                                                            {bi.loading ? 'Loading...' : bi.item?.name || bi.id}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted">
                                                                {bi.type}
                                                            </span>
                                                            {bi.type === 'unit' && bi.unit && (
                                                                <span className="text-[9px] font-mono text-primary/70">
                                                                    S/N: {bi.unit.serial_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${config.bg} ${config.color} border ${config.border}`}>
                                                    <Icon className="w-2.5 h-2.5" />
                                                    {config.label}
                                                </div>
                                            </div>

                                            {/* Details Grid */}
                                            {!bi.loading && bi.item && (
                                                <div className="grid grid-cols-2 gap-2 pl-13">
                                                    {[
                                                        { label: 'Classification', value: bi.item.classification },
                                                        { label: 'Category', value: bi.item.category },
                                                        { label: 'Condition', value: bi.unit ? bi.unit.condition : bi.item.condition },
                                                        { label: 'Location', value: bi.unit?.active_borrow?.location_name || (bi.item.active_borrows && bi.item.active_borrows[0]?.location_name), icon: MapPin },
                                                    ].filter(d => d.value).map(({ label, value, icon: DetailIcon }) => (
                                                        <div key={label} className="flex flex-col gap-0.5 min-w-0">
                                                            <p className="text-[8px] uppercase font-bold text-muted-foreground/60 tracking-wider flex items-center gap-1">
                                                                {DetailIcon && <DetailIcon className="w-2 h-2" />}
                                                                {label}
                                                            </p>
                                                            <p className="text-[10px] font-semibold truncate leading-tight">
                                                                {value}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {bi.item?.description && (
                                                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed pl-13">
                                                    {bi.item.description}
                                                </p>
                                            )}

                                            {/* Activity / History */}
                                            {!bi.loading && bi.item && (
                                                <div className="pl-13 space-y-2">
                                                    <button
                                                        onClick={() => {
                                                            const key = `${bi.type}-${bi.id}`;
                                                            setExpandedHistoryItems(prev => ({ ...prev, [key]: !prev[key] }));
                                                        }}
                                                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                                                    >
                                                        <History className="w-3 h-3" />
                                                        {expandedHistoryItems[`${bi.type}-${bi.id}`] ? 'Hide Activity' : 'Show Activity'}
                                                    </button>

                                                    {expandedHistoryItems[`${bi.type}-${bi.id}`] && (
                                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            {(bi.unit?.borrow_history || bi.item.borrow_history || []).length > 0 ? (
                                                                (bi.unit?.borrow_history || bi.item.borrow_history || []).slice(0, 3).map((h, i) => (
                                                                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/40">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                                                <User className="w-3 h-3 text-muted-foreground" />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="text-[10px] font-bold truncate">{h.borrower_name}</p>
                                                                                <p className="text-[8px] text-muted-foreground uppercase">{h.location_name || 'General'}</p>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-[9px] font-medium text-muted-foreground shrink-0">{formatDate(h.returned_at)}</p>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-[10px] text-muted-foreground italic pl-2">No past records found</p>
                                                            )}
                                                            {(bi.unit?.borrow_history || bi.item.borrow_history || []).length > 3 && (
                                                                <p className="text-[9px] text-center text-muted-foreground pt-1">View full history in detail mode</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {batchItems.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                                            <Package className="w-8 h-8 text-muted-foreground/30" />
                                        </div>
                                        <p className="text-sm font-medium text-muted-foreground">No items scanned yet</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-border/60 bg-muted/10 grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIsShowingBatchSummary(false)}
                                    className="h-11 rounded-xl border border-border bg-card text-xs font-bold uppercase tracking-widest hover:bg-muted transition-all active:scale-95"
                                >
                                    Add More
                                </button>
                                <button
                                    onClick={() => {
                                        setBatchItems([]);
                                        setIsShowingBatchSummary(false);
                                        toast.success('Batch processing completed');
                                    }}
                                    className="h-11 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Complete
                                </button>
                            </div>
                        </div>
                    </div>
                ) : !scannedData ? (
                    /* Scanner View */
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl" style={{ aspectRatio: '9 / 16', maxHeight: '100vh', minHeight: 400 }}>
                            <Scanner onScan={(result) => handleScan(result)} components={{ finder: false }} />

                            {/* Corner guides */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="relative w-48 h-48">
                                    <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/80 rounded-tl-lg" />
                                    <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/80 rounded-tr-lg" />
                                    <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/80 rounded-bl-lg" />
                                    <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/80 rounded-br-lg" />
                                </div>
                            </div>

                            {/* Scan hint */}
                            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/70 to-transparent flex justify-center pointer-events-none">
                                <p className="text-white/75 text-xs font-medium tracking-wide">
                                    {isBatchMode ? `Batch Mode Active - ${batchItems.length} scanned` : 'Position the QR code within the frame'}
                                </p>
                            </div>
                        </div>

                        {/* Batch List */}
                        {isBatchMode && batchItems.length > 0 && (
                            <div className="flex-1 flex flex-col min-h-0 bg-card border border-border rounded-3xl overflow-hidden shadow-xl animate-in slide-in-from-bottom-4">
                                <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Layers className="w-3 h-3 text-primary" />
                                        </div>
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Scanned Items ({batchItems.length})</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setBatchItems([])}
                                            className="text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors"
                                        >
                                            Clear All
                                        </button>
                                        <button
                                            onClick={() => setIsShowingBatchSummary(true)}
                                            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider shadow-sm hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto divide-y divide-border/40">
                                    {batchItems.map((bi) => (
                                        <div key={`${bi.type}-${bi.id}`} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors group">
                                            <div
                                                className="flex-1 flex items-center gap-3 cursor-pointer"
                                                onClick={() => {
                                                    setScannedData({ type: bi.type, id: bi.id, itemId: bi.itemId });
                                                    setIsBatchMode(false); // Switch to detail view
                                                }}
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-muted border border-border/50 flex items-center justify-center shrink-0">
                                                    {bi.loading ? (
                                                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold truncate">
                                                        {bi.loading ? 'Loading...' : bi.item?.name || bi.id}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide flex items-center gap-1.5">
                                                        {bi.type === 'unit' && bi.unit ? (
                                                            <>
                                                                <span className="text-primary/70">{bi.unit.serial_number}</span>
                                                                <span className="w-1 h-1 rounded-full bg-border" />
                                                            </>
                                                        ) : null}
                                                        {bi.type}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setBatchItems(prev => prev.filter(p => !(p.id === bi.id && p.type === bi.type)))}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Results View */
                    <div className="flex-1 overflow-y-auto -mx-4 px-4">
                        {loading ? (
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center py-16 gap-4">
                                <div className="relative w-16 h-16">
                                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                                    <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
                                        <QrCode className="w-5 h-5 text-primary" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-foreground">Looking up equipment…</p>
                                    <p className="text-xs text-muted-foreground mt-1">Fetching details from inventory</p>
                                </div>
                            </div>
                        ) : item ? (
                            <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-500 pb-4">

                                {/* Hero Card */}
                                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm p-5 text-card-foreground">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                                            <Package className="w-7 h-7 text-primary" />
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusConfig.bg} ${statusConfig.border} border ${statusConfig.color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {statusConfig.label}
                                        </div>
                                    </div>

                                    <h2 className="text-xl font-bold font-heading leading-tight mb-1">
                                        {unit ? `${item.name}` : item.name}
                                    </h2>
                                    {unit && (
                                        <p className="text-xs font-mono text-primary/80 bg-primary/8 border border-primary/15 rounded-lg px-2 py-1 inline-block mb-2">
                                            S/N: {unit.serial_number}
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground leading-relaxed" suppressHydrationWarning>
                                        {unit ? (unit.description || 'No specific description for this unit.') : (item.description || 'No description provided.')}
                                    </p>

                                    {/* Active borrow */}
                                    {unit?.active_borrow && renderActiveBorrow(unit.active_borrow)}
                                    {!unit && item.active_borrows && item.active_borrows.length > 0 && (
                                        <div className="mt-5 space-y-2">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                                                Active Assignments ({item.active_borrows.length})
                                            </p>
                                            {item.active_borrows.map((b, i) => (
                                                <div key={i} className="p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                                <User className="w-3.5 h-3.5 text-primary" />

                                                            </div>
                                                            <span className="text-sm font-semibold">{b.borrower_name}</span>
                                                        </div>
                                                        {b.location_name && (
                                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{b.location_name}</span>
                                                        )}
                                                    </div>
                                                    {b.return_at && (
                                                        <p className="text-xs text-muted-foreground mt-2 ml-9">Due: {formatDate(b.return_at)}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Info Grid */}
                                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                                    <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2.5 bg-muted/30">
                                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Info className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/70">Details</h3>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-2.5">
                                        {[
                                            { label: 'Condition', value: (unit ? unit.condition : item.condition) || 'N/A' },
                                            { label: 'Classification', value: item.classification || 'N/A' },
                                            { label: 'Type', value: item.item_type || 'N/A' },
                                            { label: 'Category', value: item.category || 'N/A' },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="p-3 rounded-xl bg-muted/40 border border-border/40">
                                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{label}</p>
                                                <p className="text-sm font-semibold capitalize truncate">{value}</p>
                                            </div>
                                        ))}

                                        {!unit && (
                                            <>
                                                <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Total Units</p>
                                                    <p className="text-sm font-bold tabular-nums">{item.total_qty}</p>
                                                </div>
                                                <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                                                    <p className="text-[9px] text-emerald-700/60 dark:text-emerald-400/60 font-bold uppercase tracking-widest mb-1">In Stock</p>
                                                    <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{item.available_qty}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Borrow History */}
                                {renderBorrowHistory(unit?.borrow_history || item.borrow_history || [])}

                                {/* Scan Another */}
                                <button
                                    onClick={() => { setScannedData(null); setItem(null); setUnit(null); }}
                                    className="w-full h-13 bg-primary text-primary-foreground flex items-center justify-center gap-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.98] transition-all"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Scan Another Code
                                </button>
                            </div>
                        ) : (
                            /* Not Found */
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center py-16 text-center gap-4 animate-in fade-in duration-300">
                                <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                    <Package className="w-9 h-9 text-rose-500/60" />
                                </div>
                                <div>
                                    <p className="font-bold text-lg mb-1">Not Found</p>
                                    <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
                                        This item could not be found in the inventory system.
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setScannedData(null); }}
                                    className="flex items-center gap-2 px-5 h-11 bg-muted border border-border rounded-xl font-semibold text-sm hover:bg-muted/80 transition-all active:scale-95"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
