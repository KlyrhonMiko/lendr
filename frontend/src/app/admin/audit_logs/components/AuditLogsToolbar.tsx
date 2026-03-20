'use client';

import { Search } from 'lucide-react';

export function AuditLogsToolbar({
  search,
  onSearchChange,
  entityFilter,
  onEntityFilterChange,
  timeframe,
  onTimeframeChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  entityFilter: string;
  onEntityFilterChange: (v: string) => void;
  timeframe: string;
  onTimeframeChange: (v: string) => void;
}) {
  return (
    <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
      <div className="relative w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search Actor ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
        />
      </div>

      <select
        value={entityFilter}
        onChange={(e) => onEntityFilterChange(e.target.value)}
        className="h-10 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
      >
        <option value="">All Systems</option>
        <option value="user">User Account</option>
        <option value="role">Permissions &amp; Roles</option>
        <option value="config">System Configuration</option>
        <option value="auth">Security &amp; Session</option>
        <option value="session">Login &amp; Sessions</option>
      </select>

      <select
        value={timeframe}
        onChange={(e) => onTimeframeChange(e.target.value)}
        className="h-10 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium ml-auto"
      >
        <option value="all">All Time</option>
        <option value="24h">Last 24 Hours</option>
        <option value="7d">Last 7 Days</option>
        <option value="30d">Last 30 Days</option>
      </select>
    </div>
  );
}

