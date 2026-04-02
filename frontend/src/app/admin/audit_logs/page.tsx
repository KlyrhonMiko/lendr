"use client";

import { AlertCircle } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { AuditLogsHeader } from './components/AuditLogsHeader';
import { AuditLogsToolbar } from './components/AuditLogsToolbar';
import { AuditLogsTable } from './components/AuditLogsTable';
import { useAuditLogsManagement } from './lib/useAuditLogsManagement';

export default function AdminAuditLogsPage() {
  const {
    logs,
    meta,
    loading,
    error,
    search,
    setSearch,
    entityFilter,
    setEntityFilter,
    timeframe,
    setTimeframe,
    expandedAuditId,
    toggleExpand,
    setPage,
    setPerPage,
  } = useAuditLogsManagement();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <AuditLogsHeader />

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <AuditLogsToolbar
          search={search}
          onSearchChange={setSearch}
          entityFilter={entityFilter}
          onEntityFilterChange={setEntityFilter}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />

        <AuditLogsTable logs={logs} loading={loading} expandedAuditId={expandedAuditId} toggleExpand={toggleExpand} />

        {meta && <Pagination meta={meta} onPageChange={setPage} onPerPageChange={setPerPage} />}
      </div>
    </div>
  );
}
