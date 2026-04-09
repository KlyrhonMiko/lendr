'use client';

import { useState, useEffect, useMemo } from 'react';
import { Activity, Database, Server, HardDrive, Users, AlertCircle, Download, ShieldCheck, ShieldAlert, ShieldX, RefreshCw, ChevronLeft, ChevronRight, FileText, Paperclip, Archive, Layers, Laptop } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from './ProgressBar';
import { toast } from 'sonner';
import { api } from '../api';
import { useHealthStatus, useHealthStorage, useHealthSessions, useHealthLogs, useHealthMutations } from '../lib/useSettingsQueries';

export function HealthSettings() {
  const [logsPage, setLogsPage] = useState(1);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');

  // Queries
  const { data: statusRes, isLoading: isLoadingStatus } = useHealthStatus();
  const { data: storageRes, isLoading: isLoadingStorage } = useHealthStorage();
  const { data: sessionsRes, isLoading: isLoadingSessions, isRefetching: isRefreshingSessions } = useHealthSessions();
  const { data: logsRes, isLoading: isLoadingLogs } = useHealthLogs({ page: logsPage, per_page: 5 });

  // Mutations
  const { terminateSession } = useHealthMutations();

  const status = statusRes?.data || null;
  const storage = storageRes?.data || null;
  const sessions = sessionsRes?.data || [];
  const logs = logsRes?.data || [];
  const logsMeta = logsRes?.meta || null;

  const isLoading = isLoadingStatus || isLoadingStorage || isLoadingSessions;
  const isRefreshing = isRefreshingSessions;

  // Async identity resolution
  useEffect(() => {
    api.getDeviceId().then(id => {
      setCurrentDeviceId(id);
    });
  }, []);

  const handleForceLogout = async (sessionId: string) => {
    const isSelf = sessions.find(s => s.session_id === sessionId)?.device_id === currentDeviceId;
    const confirmMsg = isSelf
      ? "Are you sure you want to terminate YOUR OWN session? You will be logged out immediately."
      : "Are you sure you want to forcibly terminate this user's session?";

    if (!window.confirm(confirmMsg)) return;

    terminateSession.mutate(sessionId, {
      onSuccess: () => {
        if (isSelf) {
          window.location.reload();
        }
      }
    });
  };

  const handleDownloadLog = () => {
    toast.success('Log download started');
  };

  // Memoized Storage Calculations
  const storageMetrics = useMemo(() => {
    if (!storage) return null;

    // Total space consumed by LNDR application related data
    const appDataTotal = (storage.breakdown.database || 0) +
      (storage.breakdown.backups || 0) +
      (storage.breakdown.attachments || 0) +
      (storage.breakdown.logs || 0);

    const getAppPercentage = (val: number) =>
      appDataTotal > 0 ? (val / appDataTotal) * 100 : 0;

    return {
      appDataTotal,
      database: { val: storage.breakdown.database, perc: getAppPercentage(storage.breakdown.database) },
      attachments: { val: storage.breakdown.attachments, perc: getAppPercentage(storage.breakdown.attachments) },
      backups: { val: storage.breakdown.backups, perc: getAppPercentage(storage.breakdown.backups) },
      logs: { val: storage.breakdown.logs, perc: getAppPercentage(storage.breakdown.logs) },
      systemUsage: (storage.used_space_bytes / storage.total_space_bytes) * 100
    };
  }, [storage]);

  if (isLoading && !status) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading system health data...</p>
      </div>
    );
  }

  const totalLogPages = logsMeta ? Math.ceil(logsMeta.total / logsMeta.limit) : 1;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Live Status Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatusCard
          title="Service Registry"
          status={status?.registry_status || "Disconnected"}
          icon={Activity}
          color={status?.registry_status === 'Connected' ? 'primary' : 'destructive'}
        />
        <StatusCard
          title="Database Health"
          status={status?.database_health || "Offline"}
          icon={Database}
          color={status?.database_health === 'Healthy' ? 'primary' : 'destructive'}
        />
        <StatusCard
          title="System Node Uptime"
          status={status?.uptime_formatted || "0d 00h 00m"}
          icon={Server}
          color="secondary"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Storage Usage */}
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="flex flex-row items-center gap-4 bg-muted/5 border-b border-border/50 pb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Storage Usage</CardTitle>
              <CardDescription>Breakdown of categorized application data footprint.</CardDescription>
            </div>
            {storageMetrics && (
              <div className="text-right">
                <p className="text-xs font-bold text-muted-foreground uppercase leading-tight">Total App Data</p>
                <p className="text-lg font-bold font-mono">{formatBytes(storageMetrics.appDataTotal)}</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            <div className="space-y-6">
              {/* Multi-Segment Application Data Bar */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold uppercase text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> App Data Composition</span>
                  <span className="text-foreground">Total: {formatBytes(storageMetrics?.appDataTotal || 0)}</span>
                </div>
                <div className="h-4 w-full bg-muted/30 rounded-full overflow-hidden flex border border-border/50 ring-2 ring-primary/5">
                  <div
                    className="h-full bg-rose-500 transition-all duration-500 ease-out"
                    style={{ width: `${storageMetrics?.database.perc}%` }}
                    title={`Database: ${storageMetrics?.database.perc.toFixed(1)}%`}
                  />
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                    style={{ width: `${storageMetrics?.backups.perc}%` }}
                    title={`Backups: ${storageMetrics?.backups.perc.toFixed(1)}%`}
                  />
                  <div
                    className="h-full bg-amber-500 transition-all duration-500 ease-out"
                    style={{ width: `${storageMetrics?.attachments.perc}%` }}
                    title={`Attachments: ${storageMetrics?.attachments.perc.toFixed(1)}%`}
                  />
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${storageMetrics?.logs.perc}%` }}
                    title={`Logs: ${storageMetrics?.logs.perc.toFixed(1)}%`}
                  />
                </div>
              </div>

              {/* System Disk Baseline */}
              <ProgressBar
                label="Host Disk Usage (System Baseline)"
                value={storageMetrics?.systemUsage || 0}
                max={100}
                showValue
                className="opacity-80"
                color="bg-primary/60"
              />
            </div>

            <div className="grid gap-4 pt-2">
              <StorageItem
                label="Database (Live)"
                value={formatBytes(storageMetrics?.database.val || 0)}
                percentage={storageMetrics?.database.perc || 0}
                color="bg-rose-500"
                icon={Database}
              />
              <StorageItem
                label="Local Backups"
                value={formatBytes(storageMetrics?.backups.val || 0)}
                percentage={storageMetrics?.backups.perc || 0}
                color="bg-emerald-500"
                icon={Archive}
              />
              <StorageItem
                label="User Attachments"
                value={formatBytes(storageMetrics?.attachments.val || 0)}
                percentage={storageMetrics?.attachments.perc || 0}
                color="bg-amber-500"
                icon={Paperclip}
              />
              <StorageItem
                label="System Logs"
                value={formatBytes(storageMetrics?.logs.val || 0)}
                percentage={storageMetrics?.logs.perc || 0}
                color="bg-primary"
                icon={FileText}
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card className="flex flex-col border-border/50">
          <CardHeader className="flex flex-row items-center gap-4 bg-muted/5 border-b border-border/50 pb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>{sessions.length} users currently logged in.</CardDescription>
            </div>
            <button
              className={`p-2 hover:bg-muted rounded-lg transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh Sessions"
              // onClick handled naturally by Tanstack Query refetch if we wanted, but we can have it manual too
              onClick={() => { }}
              disabled={isRefreshing}
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-4 text-[10px] uppercase">User</th>
                    <th className="px-6 py-4 text-[10px] uppercase">Role</th>
                    <th className="px-6 py-4 text-[10px] uppercase">Identity Tag</th>
                    <th className="px-6 py-4 text-right text-[10px] uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground italic">
                        No active sessions found.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <tr key={session.session_id} className={`hover:bg-muted/5 transition-colors ${session.device_id === currentDeviceId ? 'bg-primary/[0.02]' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {session.user?.username || 'Unknown User'}
                            {session.device_id === currentDeviceId && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Your current session" />
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium">{new Date(session.issued_at).toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-[9px] uppercase text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                            {session.user?.role_name || 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 group cursor-default">
                            <Laptop className={`w-3.5 h-3.5 ${session.device_id === currentDeviceId ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                            <span className="font-mono text-[10px] text-muted-foreground font-medium" title={session.device_id || 'Uknown Device'}>
                              {session.device_id ? session.device_id.slice(0, 8) + '...' : 'N/A'}
                            </span>
                            {session.device_id === currentDeviceId && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">THIS DEVICE</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleForceLogout(session.session_id)}
                            disabled={terminateSession.isPending}
                            className={`text-rose-500 font-bold text-[10px] uppercase hover:underline disabled:opacity-30 disabled:hover:no-underline transition-all ${terminateSession.isPending && terminateSession.variables === session.session_id ? 'animate-pulse' : ''}`}
                          >
                            {terminateSession.isPending && terminateSession.variables === session.session_id ? 'Terminating...' : 'Force Logout'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Error Logs */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center gap-4 bg-muted/5 border-b border-border/50 pb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <CardTitle>Recent Error Logs</CardTitle>
            <CardDescription>System-level errors and events (Paginated: 5 per page).</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadLog}
              className="flex items-center gap-2 px-4 py-2 bg-secondary/50 text-secondary-foreground rounded-lg text-sm font-bold border border-border hover:bg-secondary"
            >
              <Download className="w-4 h-4" />
              Download Log
            </button>
            <button
              className={`p-2 hover:bg-muted rounded-lg transition-colors ${isLoadingLogs ? 'animate-spin' : ''}`}
              title="Refresh Logs"
              onClick={() => { }}
              disabled={isLoadingLogs}
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Event Code</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Severity</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-border/50 font-mono text-[11px] ${isLoadingLogs ? 'opacity-50' : ''}`}>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground italic">
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((error, idx) => (
                    <tr key={idx} className="hover:bg-muted/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{error.timestamp}</td>
                      <td className="px-6 py-4 text-rose-500 font-bold whitespace-nowrap">{error.code}</td>
                      <td className="px-6 py-4 text-foreground w-full leading-relaxed">{error.message}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${getErrorStyle(error.severity)}`}>
                          {error.severity}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/30">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-bold text-foreground">{logs.length}</span> of <span className="font-bold text-foreground">{logsMeta?.total || 0}</span> logs
            </div>

            <div className="flex items-center gap-4">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Page {logsPage} of {totalLogPages}
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={logsPage <= 1 || isLoadingLogs}
                  onClick={() => setLogsPage(p => p - 1)}
                  className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors border border-border"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={logsPage >= totalLogPages || isLoadingLogs}
                  onClick={() => setLogsPage(p => p + 1)}
                  className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors border border-border"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type StatusCardColor = 'primary' | 'secondary' | 'destructive';

interface StatusCardProps {
  title: string;
  status: string;
  icon: LucideIcon;
  color: StatusCardColor;
}

function StatusCard({ title, status, icon: Icon, color }: StatusCardProps) {
  const colorMap: Record<StatusCardColor, string> = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    secondary: 'text-secondary-foreground bg-secondary-80 border-border/50',
    destructive: 'text-destructive bg-destructive/10 border-destructive/20',
  };

  const barColorMap: Record<StatusCardColor, string> = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    destructive: 'bg-destructive',
  };

  const statusIconColorMap: Record<StatusCardColor, string> = {
    primary: 'text-primary',
    secondary: 'text-secondary-foreground',
    destructive: 'text-destructive',
  };

  const statusIcons: Record<string, LucideIcon> = {
    'Connected': ShieldCheck,
    'Degraded': ShieldAlert,
    'Disconnected': ShieldX,
    'Healthy': ShieldCheck,
    'Offline': ShieldX,
  };

  const StatusIcon = statusIcons[status] || Icon;

  return (
    <Card className="border border-border/50 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
      <div className={`h-1 w-full ${barColorMap[color]}`} />
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase mb-0.5 tracking-tight">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold font-heading text-foreground">{status}</p>
            {statusIcons[status] && <StatusIcon className={`w-4 h-4 ${statusIconColorMap[color]}`} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StorageItemProps {
  label: string;
  value: string;
  percentage: number;
  color: string;
  icon?: LucideIcon;
}

function StorageItem({ label, value, percentage, color, icon: Icon }: StorageItemProps) {
  return (
    <div className="group space-y-2">
      <div className="flex justify-between items-end px-0.5">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="text-[11px] font-bold uppercase text-muted-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
        </div>
        <span className="text-xs font-bold font-mono text-foreground">{value} <span className="text-muted-foreground font-medium text-[10px] ml-1">({percentage.toFixed(1)}%)</span></span>
      </div>
      <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700 ease-out shadow-sm`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getErrorStyle(severity: string) {
  switch (severity) {
    case 'Critical': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    case 'Warning': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'Error': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    default: return 'bg-primary/10 text-primary border-primary/20';
  }
}
