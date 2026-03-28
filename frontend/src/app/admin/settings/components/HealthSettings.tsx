'use client';

import { Activity, Database, Server, HardDrive, Users, AlertCircle, Download, ShieldCheck, ShieldAlert, ShieldX, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from './ProgressBar';
import { toast } from 'sonner';

export function HealthSettings() {
  const sessions = [
    { id: 1, user: 'Admin User', role: 'Super Admin', login: '2026-03-29 01:15 AM', ip: '192.168.1.1' },
    { id: 2, user: 'Asset Manager', role: 'Staff', login: '2026-03-29 00:45 AM', ip: '110.54.21.3' },
    { id: 3, user: 'Service Desk', role: 'IT Support', login: '2026-03-29 11:30 PM', ip: '203.111.98.5' },
  ];

  const errors = [
    { id: 1, time: '2026-03-29 01:42:05', code: '500-INTERNAL', msg: 'Database connection timeout during cleanup', severity: 'Critical' },
    { id: 2, time: '2026-03-29 01:38:12', code: '403-FORBIDDEN', msg: 'Unauthorized attempt to access audit logs', severity: 'Warning' },
    { id: 3, time: '2026-03-29 00:55:01', code: '404-NOTFOUND', msg: 'Resource request for non-existent asset ID', severity: 'Info' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Live Status Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatusCard title="Service Registry" status="Connected" icon={Activity} color="primary" />
        <StatusCard title="Database Health" status="Healthy" icon={Database} color="primary" />
        <StatusCard title="System Node Uptime" status="45d 04h 12m" icon={Server} color="secondary" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Storage Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Storage Usage</CardTitle>
              <CardDescription>Visual breakdown of disk space consumed by different categories.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <ProgressBar label="Total Storage Used" value={68} max={100} showValue />
            
            <div className="grid gap-4 pt-2">
               <StorageItem label="Logs" value="1.2 GB" percentage={15} color="bg-indigo-400" />
               <StorageItem label="Attachments" value="4.8 GB" percentage={45} color="bg-amber-400" />
               <StorageItem label="Backups" value="2.1 GB" percentage={28} color="bg-emerald-400" />
               <StorageItem label="Database" value="0.8 GB" percentage={12} color="bg-rose-400" />
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>{sessions.length} users currently logged in.</CardDescription>
            </div>
            <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Refresh Sessions">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </CardHeader>
          <CardContent className="p-0 border-t border-border flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">IP Address</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium">{session.user}</div>
                        <div className="text-[10px] text-muted-foreground">{session.login}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-[10px] uppercase text-primary">{session.role}</td>
                      <td className="px-6 py-4 font-mono text-xs">{session.ip}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-rose-500 font-bold text-[10px] uppercase hover:underline">Force Logout</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Error Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <CardTitle>Recent Error Logs</CardTitle>
            <CardDescription>The last system-level errors recorded in the event log.</CardDescription>
          </div>
          <button 
            onClick={() => toast.success('Log download started')}
            className="flex items-center gap-2 px-4 py-2 bg-secondary/50 text-secondary-foreground rounded-lg text-sm font-bold border border-border hover:bg-secondary"
          >
            <Download className="w-4 h-4" />
            Download Log
          </button>
        </CardHeader>
        <CardContent className="p-0 border-t border-border">
          <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-muted/30 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Error Code</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Severity</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/50 font-mono text-[11px]">
                  {errors.map((error) => (
                    <tr key={error.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">{error.time}</td>
                      <td className="px-6 py-4 text-rose-500 font-bold">{error.code}</td>
                      <td className="px-6 py-4 text-muted-foreground">{error.msg}</td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getErrorStyle(error.severity)}`}>
                           {error.severity}
                         </span>
                      </td>
                    </tr>
                  ))}
               </tbody>
             </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({ title, status, icon: Icon, color }: any) {
  const colorMap: any = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    secondary: 'text-secondary-foreground bg-secondary/80 border-border/50',
    destructive: 'text-destructive bg-destructive/10 border-destructive/20',
  };

  const statusIcons: any = {
    'Connected': ShieldCheck,
    'Degraded': ShieldAlert,
    'Disconnected': ShieldX,
    'Healthy': ShieldCheck,
  };

  const StatusIcon = statusIcons[status] || Icon;

  return (
    <Card className="border border-border/50 shadow-sm overflow-hidden group">
      <div className={`h-1 w-full bg-${color}`} />
      <CardContent className="p-6 flex items-center gap-4">
         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${colorMap[color]}`}>
            <Icon className="w-6 h-6" />
         </div>
         <div>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-0.5">{title}</p>
            <div className="flex items-center gap-2">
               <p className="text-xl font-bold font-heading">{status}</p>
               {statusIcons[status] && <StatusIcon className={`w-4 h-4 text-${color}`} />}
            </div>
         </div>
      </CardContent>
    </Card>
  );
}

function StorageItem({ label, value, percentage, color }: any) {
  return (
    <div className="space-y-1.5">
       <div className="flex justify-between text-[11px] font-bold uppercase text-muted-foreground px-0.5">
         <span>{label}</span>
         <span>{value} ({percentage}%)</span>
       </div>
       <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
       </div>
    </div>
  );
}

function getErrorStyle(severity: string) {
  switch (severity) {
    case 'Critical': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    case 'Warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'Error': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    default: return 'bg-primary/10 text-primary border-primary/20';
  }
}
