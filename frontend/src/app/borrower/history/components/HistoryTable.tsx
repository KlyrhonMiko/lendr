'use client';

import { Fragment, useState } from 'react';
import {
    ChevronDown,
    ChevronRight,
    Clock,
    PackageOpen,
    CheckCircle2,
    XCircle,
    Archive,
    Loader2,
    CalendarDays,
    Hash,
    MapPin,
    User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BorrowerRequestHistoryRecord, BorrowerRequestHistoryItem, BorrowerRequestHistoryEvent } from '../../api';

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; icon: any }> = {
        pending: { bg: 'bg-primary/5 border-primary/20', text: 'text-primary font-bold', icon: Clock },
        approved: { bg: 'bg-primary/10 border-primary/20', text: 'text-primary', icon: CheckCircle2 },
        released: { bg: 'bg-primary/5 border-primary/10', text: 'text-primary/80', icon: PackageOpen },
        returned: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
        rejected: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: XCircle },
        closed: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', icon: Archive },
    };

    const c = config[status.toLowerCase()] ?? config.pending;
    const Icon = c.icon;

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border shadow-sm capitalize",
            c.bg,
            c.text
        )}>
            <Icon className="w-3 h-3" />
            {status.replace(/_/g, ' ')}
        </span>
    );
}

function formatDate(dateStr: string) {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(d);
    } catch {
        return dateStr;
    }
}

export function HistoryTable({
    records,
    loading,
}: {
    records: BorrowerRequestHistoryRecord[];
    loading: boolean;
}) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleRow = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="w-full">
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold bg-muted/20">
                            <th className="py-3.5 pl-5 w-10 text-center">#</th>
                            <th className="py-3.5 px-4"><div className="flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-muted-foreground/60" /> Request ID</div></th>
                            <th className="py-3.5 px-4"><div className="flex items-center gap-2"><PackageOpen className="w-3.5 h-3.5 text-muted-foreground/60" /> Items</div></th>
                            <th className="py-3.5 px-4"><div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground/60" /> Project / Site</div></th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-4 pr-6 text-right"><div className="flex items-center gap-2 justify-end"><CalendarDays className="w-3.5 h-3.5 text-muted-foreground/60" /> Date</div></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                                            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-pulse" />
                                        </div>
                                        <p className="text-sm font-medium text-muted-foreground animate-pulse">Fetching your history...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : records.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                                        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center border border-dashed border-border/50">
                                            <PackageOpen className="w-10 h-10 text-muted-foreground/30" />
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-foreground">No records found</p>
                                            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms.</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            records.map((record) => {
                                const isExpanded = expandedIds.has(record.request_id);
                                return (
                                    <Fragment key={record.request_id}>
                                        <tr
                                            onClick={() => toggleRow(record.request_id)}
                                            className={cn(
                                                "group border-b border-border/30 transition-all cursor-pointer hover:bg-muted/10 relative",
                                                isExpanded && "bg-muted/20 hover:bg-muted/20"
                                            )}
                                        >
                                            <td className="py-4 pl-5 w-10 text-center">
                                                <div className="flex items-center justify-center">
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4 text-primary" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 font-mono text-xs font-bold text-primary tracking-tight">
                                                {record.request_id}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="max-w-[240px]">
                                                    <p className="font-semibold text-sm text-foreground truncate">
                                                        {record.items.map((i: BorrowerRequestHistoryItem) => i.name).join(', ')}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        {record.items.length} {record.items.length === 1 ? 'item' : 'items'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="max-w-[200px]">
                                                    {record.customer_name ? (
                                                        <p className="text-sm font-medium text-foreground truncate">{record.customer_name}</p>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground/50 italic">Personal Use</p>
                                                    )}
                                                    {record.location_name && (
                                                        <p className="text-[11px] text-muted-foreground truncate">{record.location_name}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <StatusBadge status={record.status} />
                                            </td>
                                            <td className="py-4 px-4 pr-6 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">
                                                {formatDate(record.request_date)}
                                            </td>
                                        </tr>

                                        {isExpanded && (
                                            <tr className="bg-muted/5 border-b border-border/40">
                                                <td colSpan={6} className="p-0">
                                                    <ExpandedContent record={record} />
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

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-border/40">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <p className="text-sm font-medium text-muted-foreground animate-pulse">Fetching history...</p>
                        </div>
                    </div>
                ) : records.length === 0 ? (
                    <div className="py-20 text-center px-4">
                        <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                                <PackageOpen className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                            <p className="text-sm font-bold text-foreground">No records found</p>
                        </div>
                    </div>
                ) : (
                    records.map((record) => (
                        <MobileRecordCard
                            key={record.request_id}
                            record={record}
                            isExpanded={expandedIds.has(record.request_id)}
                            onToggle={() => toggleRow(record.request_id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function MobileRecordCard({
    record,
    isExpanded,
    onToggle
}: {
    record: BorrowerRequestHistoryRecord;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    return (
        <div className={cn(
            "flex flex-col transition-colors",
            isExpanded ? "bg-muted/10" : "bg-transparent active:bg-muted/5"
        )}>
            <div
                onClick={onToggle}
                className="px-4 py-5 flex items-start gap-4 cursor-pointer"
            >
                <div className={cn(
                    "mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    isExpanded ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"
                )}>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold text-primary truncate tracking-tight">
                            {record.request_id}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground/60 whitespace-nowrap">
                            {formatDate(record.request_date).split(',')[0]}
                        </span>
                    </div>

                    <h4 className="text-sm font-bold text-foreground line-clamp-1 mb-1.5">
                        {record.items.map((i: BorrowerRequestHistoryItem) => i.name).join(', ')}
                    </h4>

                    <div className="flex items-center flex-wrap gap-2 mt-2">
                        <StatusBadge status={record.status} />
                        {record.location_name && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium truncate max-w-[150px]">
                                <MapPin className="w-2.5 h-2.5 text-muted-foreground/40" />
                                {record.location_name}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="px-4 pb-6 animate-in slide-in-from-top-1 duration-200">
                    <ExpandedContent record={record} isMobile />
                </div>
            )}
        </div>
    );
}

function ExpandedContent({ record, isMobile = false }: { record: BorrowerRequestHistoryRecord; isMobile?: boolean }) {
    return (
        <div className={cn(
            "animate-in slide-in-from-top-1 duration-200",
            isMobile ? "space-y-8" : "px-6 py-6 pl-14"
        )}>
            <div className={cn(
                "grid grid-cols-1 gap-8",
                !isMobile && "lg:grid-cols-2 max-w-5xl"
            )}>
                {/* Items Section */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <PackageOpen className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Requested Items</h4>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/50 overflow-hidden shadow-sm">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/40 border-b border-border/40">
                                <tr className="text-muted-foreground font-semibold">
                                    <th className="px-4 py-2.5 text-left">Item Name</th>
                                    {!isMobile && <th className="px-4 py-2.5 text-left">Type</th>}
                                    <th className="px-4 py-2.5 text-right">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {record.items.map((item: BorrowerRequestHistoryItem, idx: number) => (
                                    <tr key={`${record.request_id}-${idx}`} className="hover:bg-muted/20">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-foreground">{item.name}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.item_id}</p>
                                        </td>
                                        {!isMobile && (
                                            <td className="px-4 py-3 text-muted-foreground font-medium">
                                                {item.item_type || 'Equipment'}
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-right">
                                            <span className="inline-flex items-center justify-center h-6 w-8 rounded bg-muted/60 font-bold">
                                                {item.qty_requested}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Timeline Section */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-orange-500/10">
                            <Clock className="w-3.5 h-3.5 text-orange-600" />
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Activity Timeline</h4>
                    </div>
                    <div className="relative pl-6 py-2">
                        <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-border rounded-full" />
                        <div className="space-y-6">
                            {record.events.map((event: BorrowerRequestHistoryEvent, idx: number) => (
                                <div key={event.event_id} className="relative">
                                    <div className={cn(
                                        "absolute -left-[20px] top-0.5 w-4 h-4 rounded-full border-2 border-background ring-4 ring-muted/10 z-20 transition-all",
                                        idx === 0 ? "bg-primary scale-110 shadow-lg shadow-primary/20 ring-primary/10" : "bg-muted-foreground/30 ring-muted/5"
                                    )} />
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-foreground capitalize tracking-wide">
                                                {event.event_type.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">
                                                {formatDate(event.occurred_at)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                            <User className="w-3 h-3 opacity-50" />
                                            <span>by {event.actor_name || 'System'}</span>
                                        </div>
                                        {event.note && (
                                            <p className="mt-2 text-[11px] text-muted-foreground/80 leading-relaxed bg-muted/30 px-3 py-2 rounded-lg border border-border/30 italic">
                                                “{event.note}”
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Details */}
            {record.notes && (
                <div className={cn(
                    "mt-8 pt-6 border-t border-border/60",
                    !isMobile && "max-w-5xl"
                )}>
                    <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Request Remarks</h5>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-muted/10 p-4 rounded-xl border border-border/40">
                        {record.notes}
                    </p>
                </div>
            )}
        </div>
    );
}
