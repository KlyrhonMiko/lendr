'use client';

import { useState, useRef, useEffect } from 'react';
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
  ShieldCheck,
  Barcode,
  Layers,
  AlertCircle,
  Sparkles,
  Table as TableIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  useImportHistory,
  useImportInventory,
  useExportData,
  useDownloadTemplate,
  ImportHistoryItem,
  ImportHistoryErrorLogEntry,
} from '../lib/useImportExport';
import { useInventoryItems } from '@/app/inventory/items/lib/useItemQueries';
import { User as SystemUser } from '@/app/admin/users/api';
import { format } from 'date-fns';

export function ImportExportSettings() {
  const [page, setPage] = useState(1);
  const perPage = 5;
  const [duplicateMode, setDuplicateMode] = useState('skip');
  const [isIntegrityModalOpen, setIsIntegrityModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<ImportHistoryItem | null>(null);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { data: historyResponse, isLoading: historyLoading } = useImportHistory(page, perPage);
  const mutation = useImportInventory();
  const { exportData } = useExportData();
  const { downloadTemplate } = useDownloadTemplate();
  const { data: itemsResponse } = useInventoryItems({ per_page: 500 });
  const items = itemsResponse?.data || [];

  const [users, setUsers] = useState<SystemUser[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get<SystemUser[]>('/inventory/data/borrowers');
        setUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch borrowers for export filter:', err);
      }
    };
    fetchUsers();
  }, []);

  // Audit Log Export State
  const [auditParams, setAuditParams] = useState({
    from_date: '',
    to_date: '',
    format: 'csv'
  });
  
  // Catalog Export State
  const [catalogParams, setCatalogParams] = useState({
    format: 'xlsx'
  });

  // Ledger Export State
  const [borrowParams, setBorrowParams] = useState({
    status: 'all',
    format: 'xlsx',
    borrower_id: ''
  });

  const [movementParams, setMovementParams] = useState({
    movement_type: 'all',
    item_id: '',
    format: 'xlsx'
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      mutation.mutate({ file, mode: duplicateMode });
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    }
  };

  const importHistory = historyResponse?.data || [];
  const meta = historyResponse?.meta;

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
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-4 bg-muted/10 hover:bg-muted/20 transition-all cursor-pointer group ${mutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv"
                onChange={handleFileSelect}
              />
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
                {mutation.isPending ? <RefreshCcw className="w-8 h-8 animate-spin" /> : <FileSpreadsheet className="w-8 h-8" />}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">{mutation.isPending ? 'Importing...' : 'Click to upload or drag and drop'}</p>
                <p className="text-xs text-muted-foreground mt-1">Accepted format: CSV only (max 10MB)</p>
              </div>
              <button 
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition-colors"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Processing...' : 'Select File'}
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
              <button 
                onClick={downloadTemplate}
                className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600"
              >
                Download
              </button>
            </div>

            <div className="grid gap-4">
              <label className="text-sm font-semibold px-1">Duplicate Handling</label>
              <div className="grid grid-cols-2 gap-2">
                {['Skip', 'Overwrite'].map((mode) => (
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
             <button 
               onClick={() => setIsIntegrityModalOpen(true)}
               className="w-full h-12 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl text-sm font-bold transition-all border border-border/50 hover:border-indigo-500/30 group"
             >
               View Import Rules & Validation <FileText className="w-4 h-4 group-hover:text-indigo-500 transition-colors" />
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
                  {historyLoading ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-muted-foreground">
                        <RefreshCcw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading history...
                      </td>
                    </tr>
                  ) : importHistory.map((item, i) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 pl-6 text-muted-foreground font-mono">
                         {item.created_at}
                      </td>
                      <td className="p-4 font-semibold">{item.filename}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border capitalize ${
                          item.status === 'completed' 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                            : item.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {item.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                         {(item.status === 'failed' || item.status === 'partial_success' || item.error_count > 0) && (
                           <button 
                             onClick={() => {
                               setSelectedHistory(item);
                               setIsErrorModalOpen(true);
                             }}
                             className="text-xs text-rose-500 hover:underline font-bold"
                           >
                             View Errors
                           </button>
                         )}
                      </td>
                    </tr>
                  ))}
                  {!historyLoading && importHistory.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-muted-foreground italic">
                        No import history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="p-6 border-t border-border/50 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <button 
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
                <span className="text-xs font-bold">Page {page}</span>
                <button 
                  disabled={!meta || page * perPage >= meta.total}
                  onClick={() => setPage(page + 1)}
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
             </div>
             <button className="text-xs text-indigo-500 font-bold hover:underline">View Full History</button>
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
            {/* Inventory Catalog */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-500 px-1">
                <Barcode className="w-4 h-4" />
                Inventory Catalog (Full State)
              </div>
               <div className="grid gap-4">
                 <p className="text-xs text-muted-foreground leading-relaxed px-1">
                   Export all catalog items, individual tracked units (with serials), and consumable batches in a single report.
                 </p>
                 <Select 
                   label="Format"
                   value={catalogParams.format}
                   onChange={(e) => setCatalogParams({...catalogParams, format: (e.target as HTMLSelectElement).value})}
                   options={[
                     { label: 'Excel (XLSX)', value: 'xlsx' },
                     { label: 'CSV (Comma Separated)', value: 'csv' },
                   ]}
                 />
                 <button 
                   onClick={() => exportData('catalog', catalogParams)}
                   className="w-full h-11 bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                 >
                   <Download className="w-4 h-4" /> Export Complete State
                 </button>
               </div>
            </div>

            {/* Audit Logs */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-500 px-1">
                <FilePieChart className="w-4 h-4" />
                Audit Logs
              </div>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="From Date" 
                    type="date" 
                    value={auditParams.from_date}
                    onChange={(e) => setAuditParams({...auditParams, from_date: e.target.value})}
                  />
                  <Input 
                    label="To Date" 
                    type="date" 
                    value={auditParams.to_date}
                    onChange={(e) => setAuditParams({...auditParams, to_date: e.target.value})}
                  />
                </div>
                <Select 
                  label="Format"
                  value={auditParams.format}
                  onChange={(e) => setAuditParams({...auditParams, format: (e.target as HTMLSelectElement).value})}
                  options={[
                    { label: 'CSV (Comma Separated Values)', value: 'csv' },
                    { label: 'XLSX (Excel Spreadsheet)', value: 'xlsx' },
                  ]}
                />
                <button 
                  onClick={() => exportData('audit', auditParams)}
                  className="w-full h-11 bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
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
                  <div className="space-y-4">
                    <Select 
                       label="Specific Borrower (Optional)" 
                       value={borrowParams.borrower_id}
                       onChange={(e) => setBorrowParams({...borrowParams, borrower_id: (e.target as HTMLSelectElement).value})}
                       options={[
                          { label: 'All Borrowers', value: '' },
                          ...users.map(u => ({ 
                            label: `${u.first_name} ${u.last_name} (${u.user_id})`, 
                            value: u.user_id 
                          }))
                        ]} 
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Select 
                         label="Status Filter" 
                         value={borrowParams.status}
                         onChange={(e) => setBorrowParams({...borrowParams, status: (e.target as HTMLSelectElement).value})}
                         options={[
                            { label: 'All Statuses', value: 'all' },
                            { label: 'Pending', value: 'pending' },
                            { label: 'Approved', value: 'approved' },
                            { label: 'Returned', value: 'returned' },
                          ]} 
                      />
                      <Select 
                         label="Format" 
                         value={borrowParams.format}
                         onChange={(e) => setBorrowParams({...borrowParams, format: (e.target as HTMLSelectElement).value})}
                         options={[
                            { label: 'Excel (XLSX)', value: 'xlsx' },
                            { label: 'CSV', value: 'csv' },
                          ]} 
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => exportData('requests', borrowParams)}
                    className="w-full h-10 bg-muted hover:bg-muted font-bold text-xs rounded-lg transition-colors border border-border"
                  >
                    Export History
                  </button>
                </div>

                <div className="space-y-4 p-4 rounded-2xl border border-border bg-muted/5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Equipment Movements</p>
                  <div className="space-y-4">
                    <Select 
                       label="Specific Item (Optional)" 
                       value={movementParams.item_id}
                       onChange={(e) => setMovementParams({...movementParams, item_id: (e.target as HTMLSelectElement).value})}
                       options={[
                          { label: 'All Items', value: '' },
                          ...items.map(item => ({ 
                            label: `${item.name} (${item.item_id})`, 
                            value: item.item_id 
                          }))
                        ]} 
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Select 
                         label="Movement Type" 
                         value={movementParams.movement_type}
                         onChange={(e) => setMovementParams({...movementParams, movement_type: (e.target as HTMLSelectElement).value})}
                         options={[
                            { label: 'All Movements', value: 'all' },
                            { label: 'In Only', value: 'in' },
                            { label: 'Out Only', value: 'out' },
                          ]} 
                      />
                      <Select 
                         label="Format" 
                         value={movementParams.format}
                         onChange={(e) => setMovementParams({...movementParams, format: (e.target as HTMLSelectElement).value})}
                         options={[
                            { label: 'Excel (XLSX)', value: 'xlsx' },
                            { label: 'CSV', value: 'csv' },
                          ]} 
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => exportData('movements', movementParams)}
                    className="w-full h-10 bg-muted hover:bg-muted font-bold text-xs rounded-lg transition-colors border border-border"
                  >
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
        <CardContent className="relative">
          {/* Overlay for Coming Soon */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-b-3xl">
             <div className="px-6 py-3 bg-indigo-500 text-white rounded-2xl font-bold shadow-2xl flex items-center gap-2 animate-pulse">
                <Clock className="w-5 h-5" /> Feature Coming Soon
             </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3 opacity-40 grayscale">
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

      {/* Data Integrity Modal */}
      {isIntegrityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Import Rules & Data Integrity</h3>
                  <p className="text-xs text-muted-foreground">Detailed guide on how to structure your CSV for successful bulk ingestion.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsIntegrityModalOpen(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Close Guide"
              >
                <XCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-border">
              {/* High-Level Overview Cards */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Trackable Items Logic Card */}
                <div className="relative group p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Barcode className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-widest">Trackable (Equipment)</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold mb-2">Trackable Item Strategy</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Used for unique assets like Laptops, Drones, or Tools. Each row is treated as a <span className="text-blue-500 font-bold">unique physical unit</span>.
                    </p>
                  </div>
                  <ul className="text-xs space-y-2 mt-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5" />
                      <div><span className="font-bold text-foreground">serial_number:</span> Mandatory and must be unique.</div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5" />
                      <div><span className="font-bold text-foreground">quantity:</span> Ignored (defaults to 1 unit per serial).</div>
                    </li>
                  </ul>
                </div>

                {/* Untrackable/Consumable Logic Card */}
                <div className="relative group p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Layers className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest">Untrackable (Consumables)</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold mb-2">Bulk Consumable Strategy</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Used for items tracked in <span className="text-amber-500 font-bold">batches</span> such as Masks, Batteries, or Perishables.
                    </p>
                  </div>
                  <ul className="text-xs space-y-2 mt-2">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                      <div><span className="font-bold text-foreground">quantity:</span> Mandatory (must be greater than 0).</div>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                      <div><span className="font-bold text-foreground">expiration_date:</span> Mandatory for consumables (YYYY-MM-DD).</div>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Advanced Field Reference */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold px-1 flex items-center gap-2">
                   <TableIcon className="w-4 h-4 text-indigo-500" />
                   Validation Matrix
                </h4>
                <div className="rounded-2xl border border-border overflow-hidden bg-muted/5">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                      <tr>
                        <th className="p-3 pl-6 text-left font-bold w-1/4">Field (Header)</th>
                        <th className="p-3 text-left font-bold w-1/2">Behavior & Logic</th>
                        <th className="p-3 pr-6 text-left font-bold w-1/4">Constraints</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      <tr>
                        <td className="p-3 pl-6 font-mono font-bold text-indigo-500">category</td>
                        <td className="p-3 text-muted-foreground leading-relaxed text-[11px]">High-level organizational grouping for different departments or functional areas.</td>
                        <td className="p-3 pr-6 italic font-semibold text-indigo-500/80">it_communications, medical_clinical, safety_security...</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-6 font-mono font-bold text-indigo-500">item_type</td>
                        <td className="p-3 text-muted-foreground leading-relaxed text-[11px]">Sub-category for grouping similar equipment or supplies under a classification.</td>
                        <td className="p-3 pr-6 italic font-semibold text-indigo-500/80">electronics, tools, pharmaceuticals...</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-6 font-mono font-bold text-indigo-500">classification</td>
                        <td className="p-3 text-muted-foreground leading-relaxed">System-wide categorization. Controls whether tracking rules are enforced.</td>
                        <td className="p-3 pr-6 italic font-semibold">equipment, consumable</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-6 font-mono font-bold text-indigo-500">is_trackable</td>
                        <td className="p-3 text-muted-foreground leading-relaxed">True = Asset tracking (Requires Serial). False = Batch tracking.</td>
                        <td className="p-3 pr-6 italic font-semibold text-rose-500">true, false</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-6 font-mono font-bold text-indigo-500">condition</td>
                        <td className="p-3 text-muted-foreground leading-relaxed">The physical state of the item at the time of import.</td>
                        <td className="p-3 pr-6 italic">good, fair, poor</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-6 font-mono font-bold text-indigo-500">serial_number</td>
                        <td className="p-3 text-muted-foreground leading-relaxed font-semibold">Only required if is_trackable is "true".</td>
                        <td className="p-3 pr-6 italic text-blue-500">Unique Identifier</td>
                      </tr>
                      <tr>
                        <td className="p-3 pl-6 font-mono font-bold text-indigo-500">expiration_date</td>
                        <td className="p-3 text-muted-foreground leading-relaxed font-semibold">Required for any consumable item.</td>
                        <td className="p-3 pr-6 italic text-amber-500 uppercase">YYYY-MM-DD</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dual Sample Rows */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Equipment Sample</h4>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border font-mono text-[9px] overflow-x-auto whitespace-nowrap leading-relaxed opacity-80 hover:opacity-100 transition-opacity">
                    <div className="text-muted-foreground"># Trackable Asset Row</div>
                    name,category,classification,item_type,is_trackable,serial_number
                    <br />
                    "Dell Monitor","it_communications","equipment","electronics","true","SN-102938"
                    <br />
                    "Fire Extinguisher","safety_security","equipment","tools","true","FE-998877"
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Consumable Sample</h4>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border font-mono text-[9px] overflow-x-auto whitespace-nowrap leading-relaxed opacity-80 hover:opacity-100 transition-opacity">
                    <div className="text-muted-foreground"># Non-Trackable Batch Row</div>
                    name,category,classification,item_type,is_trackable,quantity,expiration_date
                    <br />
                    "Surgical Gloves","medical_clinical","consumable","disposables","false","500","2026-12-01"
                  </div>
                </div>
              </div>

              {/* Pro Tip Box */}
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-500 mb-1 tracking-tight">System Refinement: Logic Heuristics</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Our import engine includes "Rescue Mapping". If you accidentally put "Equipment" in the <span className="font-mono">item_type</span> column instead of <span className="font-mono">classification</span>, the system will attempt to intelligently re-map it for you!
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-border bg-muted/5 flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground italic">Need help? Reference the official documentation for full API specs.</p>
              <button 
                onClick={() => setIsIntegrityModalOpen(false)}
                className="px-8 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Error Report Modal */}
      {isErrorModalOpen && selectedHistory && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-rose-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-rose-600">Import Error Report</h3>
                  <p className="text-xs text-muted-foreground">Detailed logs for <span className="font-bold text-foreground">{selectedHistory.filename}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setIsErrorModalOpen(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <XCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-border">
              <div className="p-6 bg-rose-500/5 border-b border-rose-500/10 mb-2">
                <div className="grid grid-cols-3 gap-4 text-center">
                   <div className="p-3 rounded-2xl bg-background border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Rows</p>
                      <p className="text-xl font-bold">{selectedHistory.total_rows}</p>
                   </div>
                   <div className="p-3 rounded-2xl bg-background border border-emerald-500/20">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Success</p>
                      <p className="text-xl font-bold text-emerald-600">{selectedHistory.success_count}</p>
                   </div>
                   <div className="p-3 rounded-2xl bg-background border border-rose-500/20">
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Failed</p>
                      <p className="text-xl font-bold text-rose-600">{selectedHistory.error_count}</p>
                   </div>
                </div>
              </div>

              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-card border-b border-border z-10">
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="p-4 pl-6 w-20">Row</th>
                    <th className="p-4 w-1/3">Error Message</th>
                    <th className="p-4 pr-6">Offending Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {Array.isArray(selectedHistory.error_log) && selectedHistory.error_log.map((err: ImportHistoryErrorLogEntry, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors align-top">
                      <td className="p-4 pl-6 font-mono font-bold text-rose-500">{err.row ?? '-'}</td>
                      <td className="p-4 text-sm font-medium text-foreground leading-relaxed">
                        {err.error ?? 'Unknown error'}
                      </td>
                      <td className="p-4 pr-6">
                         <div className="p-3 rounded-xl bg-muted/30 font-mono text-[10px] text-muted-foreground break-all max-h-32 overflow-y-auto">
                            {err.data ? JSON.stringify(err.data, null, 2) : 'N/A'}
                         </div>
                      </td>
                    </tr>
                  ))}
                  {(!selectedHistory.error_log || selectedHistory.error_log.length === 0) && (
                    <tr>
                      <td colSpan={3} className="p-20 text-center text-muted-foreground italic">
                         No detailed error logs found for this import.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 border-t border-border bg-muted/5 flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground italic">All changes from this import were rolled back to maintain data integrity.</p>
              <button 
                onClick={() => setIsErrorModalOpen(false)}
                className="px-8 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
