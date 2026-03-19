'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, Package, AlertCircle, CheckCircle2, Clock, Loader2, ArrowLeft, Building2, MapPin } from 'lucide-react';
import { borrowerHistoryApi, type BorrowerBorrowRequest } from './api';
import { toast } from "sonner";
import { AuthGuard } from '@/components/AuthGuard';
import Link from 'next/link';

export default function BorrowerHistoryPage() {
  const [requests, setRequests] = useState<BorrowerBorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await borrowerHistoryApi.getMyRequests();
      setRequests(res.data || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load request history';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20', label: 'Pending' };
      case 'approved':
        return { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20', label: 'Approved' };
      case 'released':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20', label: 'Released' };
      case 'returned':
        return { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20', label: 'Returned' };
      case 'rejected':
        return { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20', label: 'Rejected' };
      default:
        return { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/20', label: status };
    }
  };

  const getStatusIcon = (status: string) => {
    const iconClass = 'w-4 h-4';
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className={iconClass} />;
      case 'approved':
        return <CheckCircle2 className={iconClass} />;
      case 'released':
        return <Package className={iconClass} />;
      case 'returned':
        return <CheckCircle2 className={iconClass} />;
      case 'rejected':
        return <AlertCircle className={iconClass} />;
      default:
        return <AlertCircle className={iconClass} />;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.request_id.toLowerCase().includes(search.toLowerCase()) ||
      request.items.some(item => (item.item_name ?? '').toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === 'ALL' || request.status.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const statusOptions = ['ALL', 'PENDING', 'APPROVED', 'RELEASED', 'RETURNED', 'REJECTED'];

  return (
    <AuthGuard redirectTo="/borrow_portal/login">
      <div className="w-full min-h-screen bg-background p-8 animate-in fade-in duration-500">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center gap-4 flex-col sm:flex-row justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/borrow_portal/request_form"
                className="p-2 hover:bg-secondary rounded-xl transition-all text-muted-foreground hover:text-foreground"
                title="Back to request form"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-4xl font-bold font-heading">My Requests</h1>
                <p className="text-muted-foreground text-sm mt-1">View your borrow request history and status</p>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by request ID or item name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {statusOptions.map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    filter === status
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="font-medium">Loading your requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4 text-muted-foreground bg-card border border-border rounded-3xl">
              <Package className="w-16 h-16 opacity-20" />
              <p className="font-bold text-lg">{requests.length === 0 ? 'No requests yet' : 'No matching requests'}</p>
              <p className="text-sm">{requests.length === 0 ? 'Submit your first borrow request to see it here' : 'Try adjusting your search or filters'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map(request => {
                const statusColor = getStatusColor(request.status);
                
                // Extract event dates from events array if available
                let approvedDate: string | null = null;
                let releasedDate: string | null = null;
                let returnedDate: string | null = null;
                
                if (request.events && Array.isArray(request.events)) {
                  request.events.forEach((event: { event_type?: string; occurred_at?: string }) => {
                    if (!event || !event.occurred_at) return;
                    
                    switch (event.event_type?.toLowerCase()) {
                      case 'approved':
                        approvedDate = event.occurred_at;
                        break;
                      case 'released':
                      case 'warehouse_approved':
                        releasedDate = event.occurred_at;
                        break;
                      case 'returned':
                        returnedDate = event.occurred_at;
                        break;
                    }
                  });
                }

                return (
                  <div
                    key={request.request_id}
                    className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all animate-in fade-in"
                  >
                    {/* Header */}
                    <div className={`p-6 border-b border-border ${statusColor.bg}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-lg ${statusColor.bg} ${statusColor.text}`}>
                              {getStatusIcon(request.status)}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold font-heading text-foreground">{request.request_id}</h3>
                              <p className="text-sm text-muted-foreground">{request.request_date || 'Date unavailable'}</p>
                            </div>
                          </div>
                          {(request.customer_name || request.location_name) && (
                            <div className="flex flex-wrap gap-3 mt-2">
                              {request.customer_name && (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/50 border border-border/50 text-xs font-medium text-muted-foreground">
                                  <Building2 className="w-3 h-3" />
                                  {request.customer_name}
                                </div>
                              )}
                              {request.location_name && (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/50 border border-border/50 text-xs font-medium text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  {request.location_name}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={`px-4 py-2 rounded-xl border font-bold text-sm flex items-center gap-2 ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                          {getStatusIcon(request.status)}
                          {statusColor.label}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                      {/* Items */}
                      <div>
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Items Requested</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {request.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                  <Package className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-foreground">{item.item_name || item.item_id}</p>
                                  <p className="text-xs text-muted-foreground">Item ID: {item.item_id}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-black text-indigo-500">{item.qty_requested}</p>
                                <p className="text-xs text-muted-foreground">qty</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div>
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Timeline</h4>
                        <div className="space-y-3">
                          {request.request_date && (
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/20 border border-border/30">
                              <Calendar className="w-5 h-5 text-indigo-500" />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-muted-foreground uppercase">Requested</p>
                                <p className="text-sm font-bold text-foreground">{request.request_date}</p>
                              </div>
                            </div>
                          )}

                          {approvedDate && (
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <CheckCircle2 className="w-5 h-5 text-blue-600" />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-blue-600 uppercase">Approved</p>
                                <p className="text-sm font-bold text-foreground">{approvedDate}</p>
                              </div>
                            </div>
                          )}

                          {releasedDate && (
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                              <Package className="w-5 h-5 text-emerald-600" />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-emerald-600 uppercase">Released</p>
                                <p className="text-sm font-bold text-foreground">{releasedDate}</p>
                              </div>
                            </div>
                          )}

                          {returnedDate && (
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-500/10 border border-slate-500/20">
                              <CheckCircle2 className="w-5 h-5 text-slate-600" />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-slate-600 uppercase">Returned</p>
                                <p className="text-sm font-bold text-foreground">{returnedDate}</p>
                              </div>
                            </div>
                          )}

                          {request.status.toLowerCase() === 'rejected' && (
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                              <AlertCircle className="w-5 h-5 text-rose-600" />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-rose-600 uppercase">Rejected</p>
                                <p className="text-sm font-bold text-foreground">Request was rejected</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      {request.notes && (
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Notes</h4>
                          <p className="text-sm text-foreground">{request.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
