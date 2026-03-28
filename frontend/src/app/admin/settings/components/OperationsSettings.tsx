'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Wrench, Database, Archive, Trash2, Calendar, Clock, RefreshCw, FileText, Save } from 'lucide-react';
import { toast } from 'sonner';

export function OperationsSettings() {
  const [loading, setLoading] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('System operations updated');
    }, 1000);
  };

  const backups = [
    { id: 1, date: '2026-03-28', time: '02:00 AM', size: '154 MB', trigger: 'Scheduled', status: 'Success' },
    { id: 2, date: '2026-03-27', time: '02:00 AM', size: '152 MB', trigger: 'Scheduled', status: 'Success' },
    { id: 3, date: '2026-03-26', time: '11:45 PM', size: '151 MB', trigger: 'Manual', status: 'Success' },
    { id: 4, date: '2026-03-26', time: '02:00 AM', size: '148 MB', trigger: 'Scheduled', status: 'Failed' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Maintenance Mode */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <CardTitle>Enable Maintenance Mode</CardTitle>
            <CardDescription>Block user access to the platform for scheduled repairs or updates.</CardDescription>
          </div>
          <Toggle 
            label={maintenanceMode ? "Active" : "Inactive"} 
            checked={maintenanceMode} 
            onChange={(e) => setMaintenanceMode(e.target.checked)} 
          />
        </CardHeader>
        <CardContent className={maintenanceMode ? "space-y-6 opacity-100 transition-opacity" : "space-y-6 opacity-50 grayscale pointer-events-none transition-opacity"}>
          <Textarea label="Custom Maintenance Message" defaultValue="The system is currently undergoing scheduled maintenance. Please check back later." />
          
          <div className="grid gap-6 md:grid-cols-2">
            <Input label="Start Date/Time" type="datetime-local" />
            <Input label="End Date/Time" type="datetime-local" />
          </div>
        </CardContent>
      </Card>

      {/* Automated Backup Schedule */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <CardTitle>Automated Backup Schedule</CardTitle>
            <CardDescription>Configure periodic system data backups to ensure data safety.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Select 
            label="Frequency" 
            defaultValue="daily"
            options={[
              { label: 'Daily', value: 'daily' },
              { label: 'Weekly', value: 'weekly' },
              { label: 'Monthly', value: 'monthly' }
            ]} 
          />
          <Input label="Backup Time" type="time" defaultValue="02:00" />
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground px-1">Storage Location</label>
            <div className="h-12 flex items-center px-4 bg-muted/20 border border-border rounded-xl text-sm font-medium text-muted-foreground">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin-slow" />
              Primary: AWS S3 (Cloud)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-2 border-none bg-transparent">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <Clock className="w-5 h-5" />
          </div>
          <CardTitle className="text-lg">Backup History</CardTitle>
        </CardHeader>
        <CardContent className="p-0 border-t border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-muted/30 text-muted-foreground font-semibold">
                 <tr>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Size</th>
                    <th className="px-6 py-4">Triggered By</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border/50">
                 {backups.map((backup) => (
                   <tr key={backup.id} className="hover:bg-muted/10 transition-colors">
                     <td className="px-6 py-4 font-medium">{backup.date} {backup.time}</td>
                     <td className="px-6 py-4">{backup.size}</td>
                     <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${backup.trigger === 'Scheduled' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {backup.trigger}
                        </span>
                     </td>
                     <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 ${backup.status === 'Success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${backup.status === 'Success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {backup.status}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-right space-x-2">
                        <button className="p-2 hover:bg-emerald-500/10 hover:text-emerald-500 rounded-lg transition-colors" title="Restore">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Archives & Retention */}
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
        <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Archive className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>System Archives</CardTitle>
              <CardDescription>Set aging policies for moving records to long-term storage.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex items-end gap-3">
                <Input label="Archive audit logs older than:" type="number" defaultValue="90" className="flex-1" />
                <Select options={[{label: 'Days', value:'d'}, {label: 'Months', value:'m'}]} defaultValue="d" className="w-[110px]" />
             </div>
             <div className="flex items-end gap-3">
                <Input label="Archive borrow records older than:" type="number" defaultValue="1" className="flex-1" />
                <Select options={[{label: 'Days', value:'d'}, {label: 'Months', value:'m'}, {label: 'Years', value:'y'}]} defaultValue="y" className="w-[110px]" />
             </div>
             <button className="w-full py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold border border-border mt-2 flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors">
               <FileText className="w-4 h-4" />
               View Archived Records
             </button>
          </CardContent>
        </Card>

        <Card>
        <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Data Retention Policy</CardTitle>
              <CardDescription>Automatically purge archived data to comply with regulations.</CardDescription>
            </div>
            <Toggle defaultChecked={true} />
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex items-end gap-3">
                <Input label="Auto-delete records older than:" type="number" defaultValue="7" className="flex-1" />
                <Select options={[{label: 'Years', value:'y'}, {label: 'Months', value:'m'}]} defaultValue="y" className="w-[110px]" />
             </div>
             <div className="space-y-2">
               <label className="text-sm font-semibold text-foreground px-1">Exclusion List (Mark as Never Purge)</label>
               <div className="flex flex-wrap gap-2">
                 {['Financial Audit', 'Asset History', 'Legal Holds'].map((tag) => (
                   <span key={tag} className="px-3 py-1 bg-muted rounded-lg text-xs font-medium border border-border flex items-center gap-1.5">
                     {tag}
                     <Trash2 className="w-3 h-3 text-muted-foreground hover:text-rose-500 cursor-pointer transition-colors" />
                   </span>
                 ))}
                 <button className="px-3 py-1 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-lg text-xs font-bold hover:bg-indigo-500/20 transition-colors">
                   + Add Entry
                 </button>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Processing changes...' : 'Save Operations Configuration'}
        </button>
      </div>
    </div>
  );
}
