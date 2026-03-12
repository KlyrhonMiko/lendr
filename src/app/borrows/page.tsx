'use client';

import { useState, useEffect } from 'react';
import { History, Search, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';

interface BorrowRecord {
  id: string;
  equipment_id: string;
  equipment_name: string;
  borrower_name: string;
  released_by: string;
  borrow_date: string;
  expected_return_date: string;
  actual_return_date: string | null;
  status: string;
  return_status: string | null;
}

export default function BorrowsPage() {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'RETURNED' | 'REJECTED'>('ALL');
  const [returnStatusModal, setReturnStatusModal] = useState<{ isOpen: boolean; recordId: string | null }>({ isOpen: false, recordId: null });
  const [returnStatusValue, setReturnStatusValue] = useState('GOOD');
  const [approveModal, setApproveModal] = useState<{ isOpen: boolean; recordId: string | null }>({ isOpen: false, recordId: null });
  const [approveName, setApproveName] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/borrows');
      const data = await res.json();
      setRecords(data);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    }
  };

  const handleReturn = async () => {
    if (!returnStatusModal.recordId) return;
    try {
      await fetch(`http://localhost:5000/api/borrows/${returnStatusModal.recordId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_status: returnStatusValue }),
      });
      setReturnStatusModal({ isOpen: false, recordId: null });
      setReturnStatusValue('GOOD');
      fetchRecords(); // Refresh the list
    } catch (error) {
      console.error('Failed to return item:', error);
    }
  };

  const handleApprove = async () => {
    if (!approveModal.recordId || !approveName) return;
    try {
      await fetch(`http://localhost:5000/api/borrows/${approveModal.recordId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ released_by: approveName }),
      });
      setApproveModal({ isOpen: false, recordId: null });
      setApproveName('');
      fetchRecords(); // Refresh the list
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`http://localhost:5000/api/borrows/${id}/reject`, {
        method: 'POST',
      });
      fetchRecords(); // Refresh the list
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const openReturnModal = (id: string) => {
    setReturnStatusModal({ isOpen: true, recordId: id });
    setReturnStatusValue('GOOD');
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.borrower_name.toLowerCase().includes(search.toLowerCase()) ||
      record.equipment_name.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === 'ALL' || record.status === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-heading mb-2">Borrow History</h1>
          <p className="text-muted-foreground text-lg">Track active rentals and view past transactions.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between gap-4">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by borrower or equipment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
            />
          </div>
          <div className="flex bg-input/30 p-1 rounded-xl border border-border">
            {['ALL', 'PENDING', 'ACTIVE', 'RETURNED', 'REJECTED'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                  filter === f 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
                <th className="p-4 pl-6">Equipment</th>
                <th className="p-4">Borrower / Released By</th>
                <th className="p-4">Borrow Date</th>
                <th className="p-4">Expected Return</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredRecords.map((record) => {
                const isOverdue = record.status === 'ACTIVE' && new Date(record.expected_return_date) < new Date();

                return (
                  <tr key={record.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                          <History className="w-5 h-5" />
                        </div>
                        <p className="font-semibold text-foreground">{record.equipment_name}</p>
                      </div>
                    </td>
                    <td className="p-4 flex flex-col justify-center">
                      <span className="font-medium text-foreground">{record.borrower_name}</span>
                      <span className="text-xs text-muted-foreground mt-0.5">Released by: {record.released_by || '-'}</span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(record.borrow_date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {record.expected_return_date ? new Date(record.expected_return_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1 w-fit">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                          record.status === 'RETURNED' ? 'bg-emerald-500/10 text-emerald-500' :
                          record.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' :
                          record.status === 'REJECTED' ? 'bg-zinc-500/10 text-zinc-500' :
                          isOverdue ? 'bg-rose-500/10 text-rose-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {record.status === 'RETURNED' && <CheckCircle2 className="w-3 h-3" />}
                          {record.status === 'PENDING' && <Clock className="w-3 h-3" />}
                          {record.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                          {isOverdue && <AlertCircle className="w-3 h-3" />}
                          {isOverdue ? 'OVERDUE' : record.status}
                        </span>
                        {record.status === 'RETURNED' && record.return_status && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            record.return_status === 'GOOD' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {record.return_status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {record.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setApproveModal({ isOpen: true, recordId: record.id });
                              setApproveName('');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/20"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(record.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors border border-rose-500/20"
                          >
                            Reject
                          </button>
                        </div>
                      ) : record.status === 'ACTIVE' ? (
                        <button
                          onClick={() => openReturnModal(record.id)}
                          className="px-4 py-1.5 text-sm font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-lg transition-colors border border-indigo-500/20"
                        >
                          Mark Returned
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">
                          {record.actual_return_date ? new Date(record.actual_return_date).toLocaleDateString() : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground font-medium">
                    No borrow records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Status Modal */}
      {returnStatusModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold font-heading mb-4">Confirm Return</h2>
            <p className="text-muted-foreground mb-6">Select the condition of the equipment being returned.</p>
            
            <div className="space-y-3 mb-8">
              {['GOOD', 'DAMAGED', 'MISSING_PARTS'].map(status => (
                <button
                  key={status}
                  onClick={() => setReturnStatusValue(status)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    returnStatusValue === status 
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' 
                      : 'bg-background hover:bg-muted/50 border-border text-foreground'
                  }`}
                >
                  <span className="font-semibold text-sm">
                    {status === 'GOOD' ? 'Good Condition' : status === 'DAMAGED' ? 'Damaged' : 'Missing Parts'}
                  </span>
                  {returnStatusValue === status && <CheckCircle2 className="w-5 h-5" />}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setReturnStatusModal({ isOpen: false, recordId: null })}
                className="flex-1 py-3 rounded-xl font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleReturn}
                className="flex-1 py-3 rounded-xl font-semibold bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 transition-colors"
              >
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold font-heading mb-4">Approve Request</h2>
            <p className="text-muted-foreground mb-6">Enter the name of the person releasing the equipment.</p>
            
            <div className="space-y-4 mb-8">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Released By</label>
                <input
                  type="text"
                  placeholder="e.g. Admin User"
                  value={approveName}
                  onChange={(e) => setApproveName(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setApproveModal({ isOpen: false, recordId: null })}
                className="flex-1 py-3 rounded-xl font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleApprove}
                disabled={!approveName}
                className="flex-1 py-3 rounded-xl font-semibold bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
