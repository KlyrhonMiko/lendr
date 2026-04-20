'use client';

import { History } from 'lucide-react';
import type { PaginationMeta } from '@/lib/api';

export function HistoryHeader({
    meta,
    statusFilter,
}: {
    meta: PaginationMeta | null;
    statusFilter: string;
}) {
    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <History className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold font-heading tracking-tight">Your Borrow History</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">Track your requests and activity timeline.</p>
                </div>
            </div>
            {meta && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 font-medium border border-border/40">
                        {meta.total}
                        <span className="text-muted-foreground/70">
                            {meta.total === 1 ? 'request' : 'requests'}
                        </span>
                    </span>
                    {statusFilter && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 text-primary font-bold border border-primary/10 capitalize">
                            {statusFilter.replace(/_/g, ' ')}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
