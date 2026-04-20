'use client';

import { Search, X } from 'lucide-react';
import { FilterSelect } from '@/components/ui/filter-select';

const HISTORY_STATUS_OPTIONS = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'released', label: 'Released' },
    { key: 'returned', label: 'Returned' },
    { key: 'closed', label: 'Closed' },
    { key: 'rejected', label: 'Rejected' },
];

export function HistoryToolbar({
    search,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
}: {
    search: string;
    onSearchChange: (v: string) => void;
    statusFilter: string;
    onStatusFilterChange: (v: string) => void;
}) {
    return (
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 border-b border-border">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search Request ID, customer, location..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-11 pl-12 pr-4 rounded-lg bg-muted/50 border border-border text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />
                {search && (
                    <button
                        onClick={() => onSearchChange('')}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                        type="button"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/70 whitespace-nowrap">Filter:</span>
                <FilterSelect
                    value={statusFilter}
                    onChange={onStatusFilterChange}
                    options={HISTORY_STATUS_OPTIONS}
                    placeholder="All statuses"
                    align="end"
                />
            </div>
        </div>
    );
}
