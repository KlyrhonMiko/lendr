'use client';

import { useState, useEffect } from 'react';
import { History, Search, CheckCircle2, AlertCircle, Clock, XCircle, Plus, Loader2, Info } from 'lucide-react';
import { borrowApi, BorrowRequest } from './api';
import { inventoryApi } from '../inventory/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner";

interface BorrowRecord {
  borrow_id: string;
  item_id: string;
  borrower_id: string;
  qty_requested: number;
  status: string;
  notes?: string;
  request_date: string;
  approved_at?: string;
  released_at?: string;
  returned_at?: string;
}

interface InventoryItem {
  item_id: string;
  name: string;
  available_qty: number;
}

export default function BorrowsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [recordsRes, itemsRes] = await Promise.all([
        borrowApi.list(),
        inventoryApi.list(),
      ]);
      setRecords(recordsRes.data);
      setItems(itemsRes.data.filter(i => i.available_qty > 0));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };


  const handleAction = async (action: 'approve' | 'release' | 'return', borrowId: string) => {
    try {
      await borrowApi[action](borrowId);
      toast.success(`Request successfully ${action}ed`);
      fetchInitialData();
    } catch (err: any) {
      const msg = err.message || `Failed to ${action} request`;
      setError(msg);
      toast.error(msg);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.item_id.toLowerCase().includes(search.toLowerCase()) || 
                          record.borrower_id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || record.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-heading mb-2">Borrowing Management</h1>
          <p className="text-muted-foreground text-lg">Manage equipment requests and tracking.</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between gap-4">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
            />
          </div>
          <div className="flex bg-input/30 p-1 rounded-xl border border-border">
            {['ALL', 'pending', 'approved', 'released', 'returned'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all capitalize ${
                  filter === f 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
                <th className="p-4 pl-6">Request ID</th>
                <th className="p-4">Item & Borrower</th>
                <th className="p-4">Qty</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date Requested</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <p className="font-medium">Loading requests...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.map((record) => (
                <tr key={record.borrow_id} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-4 pl-6 font-mono text-xs text-indigo-400">
                    {record.borrow_id}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{record.item_id}</span>
                      <span className="text-xs text-muted-foreground">User ID: {record.borrower_id}</span>
                      {record.notes && (
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md w-fit">
                          <Info className="w-3 h-3" />
                          {record.notes}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium text-foreground">
                    {record.qty_requested}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 w-fit ${
                      record.status === 'returned' ? 'bg-emerald-500/10 text-emerald-500' :
                      record.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                      record.status === 'released' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-indigo-500/10 text-indigo-500'
                    }`}>
                      {record.status === 'pending' && <Clock className="w-3 h-3" />}
                      {record.status === 'returned' && <CheckCircle2 className="w-3 h-3" />}
                      <span className="capitalize">{record.status}</span>
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {record.request_date}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {record.status === 'pending' && (
                        <button
                          onClick={() => handleAction('approve', record.borrow_id)}
                          className="px-4 py-1.5 text-xs font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-all border border-amber-500/20"
                        >
                          Approve
                        </button>
                      )}
                      {record.status === 'approved' && (
                        <button
                          onClick={() => handleAction('release', record.borrow_id)}
                          className="px-4 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-all border border-blue-500/20"
                        >
                          Release
                        </button>
                      )}
                      {record.status === 'released' && (
                        <button
                          onClick={() => handleAction('return', record.borrow_id)}
                          className="px-4 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-all border border-emerald-500/20"
                        >
                          Return
                        </button>
                      )}
                      {record.status === 'returned' && (
                         <span className="text-[10px] font-medium text-muted-foreground">Completed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
