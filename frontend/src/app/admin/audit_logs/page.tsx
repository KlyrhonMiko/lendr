"use client";

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
    search,
    setSearch,
    entityFilter,
    setEntityFilter,
    timeframe,
    setTimeframe,
    expandedAuditId,
    toggleExpand,
    page,
    setPage,
    perPage,
    setPerPage,
  } = useAuditLogsManagement();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <AuditLogsHeader />

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
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
