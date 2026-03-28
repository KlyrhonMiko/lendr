'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { 
  Download, 
  Upload, 
  History, 
  FileText, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw, 
  ArrowRight,
  Database,
  FileSpreadsheet,
  FilePieChart,
  Mail,
  Table as TableIcon
} from 'lucide-react';
import { toast } from 'sonner';

export function ImportExportSettings() {
  const [loading, setLoading] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState('skip');

  const handleImport = () => {
    toast.info('Selecting file for import...');
  };

  const handleExport = (type: string) => {
    toast.success(`Exporting ${type}...`);
  };

  const importHistory = [
    { date: '2024-03-24 10:30', name: 'inventory_initial.csv', by: 'Admin', total: 150, success: 148, failed: 2, status: 'Completed' },
    { date: '2024-03-22 14:15', name: 'new_equipment_batch.csv', by: 'Inv Manager', total: 45, success: 45, failed: 0, status: 'Completed' },
    { date: '2024-03-20 09:00', name: 'equipment_update.csv', by: 'Admin', total: 200, success: 190, failed: 10, status: 'Error' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Import Section */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <CardTitle>Import Inventory Catalog</CardTitle>
              <CardDescription>Upload CSV files to bulk update or add inventory items.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-6">
            <div className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-4 bg-muted/10 hover:bg-muted/20 transition-all cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">Accepted format: CSV only (max 10MB)</p>
              </div>
              <button 
                onClick={handleImport}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-colors"
              >
                Select File
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Download CSV Template</p>
                  <p className="text-xs text-muted-foreground">Standardized template for bulk imports.</p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600">
                Download
              </button>
            </div>

            <div className="grid gap-4">
              <label className="text-sm font-semibold px-1">Duplicate Handling</label>
              <div className="grid grid-cols-3 gap-2">
                {['Skip', 'Overwrite', 'Merge'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDuplicateMode(mode.toLowerCase())}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      duplicateMode === mode.toLowerCase()
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-6 border-t border-border/50">
             <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-muted text-muted-foreground rounded-xl text-sm font-bold opacity-50 cursor-not-allowed">
               Review Import Mapping <ArrowRight className="w-4 h-4" />
             </button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <History className="w-6 h-6" />
            </div>
            <div>
              <CardTitle>Import History</CardTitle>
              <CardDescription>Review and track the status of recent data imports.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/50 text-muted-foreground bg-muted/5 font-semibold">
                  <tr>
                    <th className="p-4 pl-6">Date</th>
                    <th className="p-4">File Name</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {importHistory.map((item, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 pl-6 text-muted-foreground font-mono">{item.date}</td>
                      <td className="p-4 font-semibold">{item.name}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${
                          item.status === 'Completed' 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}>
                          {item.status === 'Completed' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                         {item.failed > 0 && (
                           <button className="text-xs text-rose-500 hover:underline">Error Report</button>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="p-6 border-t border-border/50">
             <button className="text-xs text-indigo-500 font-bold hover:underline mx-auto">View Full History</button>
          </CardFooter>
        </Card>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Export audit logs and ledger data to various formats.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-10 md:grid-cols-2">
           {/* Audit Logs */}
           <div className="space-y-6">
             <div className="flex items-center gap-2 text-sm font-semibold text-emerald-500 px-1">
               <FilePieChart className="w-4 h-4" />
               Audit Logs
             </div>
             <div className="grid gap-4">
               <div className="grid grid-cols-2 gap-4">
                 <Input label="From Date" type="date" />
                 <Input label="To Date" type="date" />
               </div>
               <Select 
                 label="Format"
                 options={[
                   { label: 'CSV (Comma Separated Values)', value: 'csv' },
                   { label: 'XLSX (Excel Spreadsheet)', value: 'xlsx' },
                 ]}
               />
               <button className="w-full h-11 bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                 <Download className="w-4 h-4" /> Export Audit Logs
               </button>
             </div>
           </div>

           {/* Ledger Data */}
           <div className="space-y-6">
             <div className="flex items-center gap-2 text-sm font-semibold text-blue-500 px-1">
               <Database className="w-4 h-4" />
               Ledger Data
             </div>
             <div className="grid gap-6">
               <div className="space-y-4 p-4 rounded-2xl border border-border bg-muted/5">
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Borrow Request History</p>
                 <div className="grid grid-cols-2 gap-4">
                   <Select label="Status Filter" options={[
                      { label: 'All Statuses', value: 'all' },
                      { label: 'Pending', value: 'pending' },
                      { label: 'Approved', value: 'approved' },
                      { label: 'Returned', value: 'returned' },
                    ]} />
                   <Select label="Format" options={[
                      { label: 'Excel (XLSX)', value: 'xlsx' },
                      { label: 'CSV', value: 'csv' },
                      { label: 'PDF Report', value: 'pdf' },
                    ]} />
                 </div>
                 <button className="w-full h-10 bg-muted hover:bg-muted font-bold text-xs rounded-lg transition-colors border border-border">
                   Export History
                 </button>
               </div>

               <div className="space-y-4 p-4 rounded-2xl border border-border bg-muted/5">
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Equipment Movements</p>
                 <div className="grid grid-cols-2 gap-4">
                   <Select label="Movement Type" options={[
                      { label: 'All Movements', value: 'all' },
                      { label: 'In Only', value: 'in' },
                      { label: 'Out Only', value: 'out' },
                    ]} />
                   <Select label="Format" options={[
                      { label: 'Excel (XLSX)', value: 'xlsx' },
                      { label: 'CSV', value: 'csv' },
                    ]} />
                 </div>
                 <button className="w-full h-10 bg-muted hover:bg-muted font-bold text-xs rounded-lg transition-colors border border-border">
                   Export Movements
                 </button>
               </div>
             </div>
           </div>
        </CardContent>
      </Card>

      {/* Scheduled Exports */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <CardTitle>Scheduled Exports</CardTitle>
              <CardDescription>Automate your reports and deliver them periodically.</CardDescription>
            </div>
          </div>
          <button className="bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20">
            Create Schedule +
          </button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4 p-6 rounded-3xl bg-muted/30 border border-border border-dashed flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-2">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold">Email Delivery</p>
                <p className="text-xs text-muted-foreground">Receive reports directly in your inbox.</p>
              </div>
            </div>
            
            <div className="space-y-4 p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-full">Weekly</span>
                 <button className="text-rose-500"><XCircle className="w-4 h-4" /></button>
              </div>
              <p className="text-sm font-bold truncate">Audit Logs Weekly Report</p>
              <p className="text-xs text-muted-foreground">Every Monday at 8:00 AM</p>
              <div className="mt-auto pt-4 border-t border-indigo-500/10 flex items-center justify-between">
                 <span className="text-xs text-indigo-500">Scheduled</span>
                 <RefreshCcw className="w-3 h-3 text-indigo-500 animate-spin-slow" />
              </div>
            </div>

            <div className="space-y-4 p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full">Daily</span>
                 <button className="text-rose-500"><XCircle className="w-4 h-4" /></button>
              </div>
              <p className="text-sm font-bold truncate">Daily Movements Summary</p>
              <p className="text-xs text-muted-foreground">Daily at 11:59 PM</p>
              <div className="mt-auto pt-4 border-t border-blue-500/10 flex items-center justify-between">
                 <span className="text-xs text-blue-500">Scheduled</span>
                 <RefreshCcw className="w-3 h-3 text-blue-500 animate-spin-slow" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
