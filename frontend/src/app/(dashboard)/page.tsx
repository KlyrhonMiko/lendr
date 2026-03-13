'use client';

import { useState, useEffect } from "react";
import { Package, Users, Activity, Box, ArrowUpRight, Loader2, Clock } from "lucide-react";
import Link from "next/link";
import { dashboardApi, DashboardStats, RecentTransaction } from "./dashboard-api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRecent()
      ]);
      setStats(statsRes.data);
      setRecent(recentRes.data);
    } catch (error: any) {
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Total Equipment", value: stats?.total_equipment ?? 0, icon: Package, color: "from-blue-500/20 to-cyan-500/20" },
    { label: "Items Borrowed", value: stats?.items_borrowed ?? 0, icon: Activity, color: "from-purple-500/20 to-pink-500/20" },
    { label: "Active Users", value: stats?.active_users ?? 0, icon: Users, color: "from-orange-500/20 to-amber-500/20" },
    { label: "Low Stock Items", value: stats?.low_stock_items ?? 0, icon: Box, color: "from-rose-500/20 to-red-500/20" },
  ];

  return (
    <div className="w-full h-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-heading mb-2">Platform Overview</h1>
          <p className="text-muted-foreground text-lg">Detailed metrics and recent equipment movement.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/pos" className="px-6 py-2.5 bg-foreground text-background font-semibold rounded-full hover:bg-foreground/90 transition-all flex items-center gap-2">
            <Activity className="w-4 h-4" />
            New Borrow
          </Link>
          <Link href="/inventory" className="px-6 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-full border border-border hover:bg-secondary/80 transition-all flex items-center gap-2">
            <Package className="w-4 h-4" />
            Manage Inventory
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="relative p-6 rounded-2xl bg-card border border-border overflow-hidden group hover:border-indigo-500/50 transition-colors">
            <div className={`absolute inset-0 bg-gradient-to-br opacity-50 ${stat.color} translate-y-[2px]`} />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-background rounded-xl border border-border text-foreground">
                  <stat.icon className="w-5 h-5" />
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
              <h3 className="text-4xl font-bold font-heading tracking-tight mb-1">
                {loading ? "..." : stat.value}
              </h3>
              <p className="text-muted-foreground font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-6 rounded-2xl bg-card border border-border flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-heading">Recent Transactions</h2>
            <Link href="/borrows" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">View All</Link>
          </div>
          
          <div className="flex-1 space-y-3">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Fetching activity log...</p>
              </div>
            ) : recent.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center bg-background rounded-xl border border-border/50 border-dashed">
                <Clock className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground text-sm font-medium">No recent transactions</p>
              </div>
            ) : (
              recent.map((item) => (
                <div key={item.borrow_id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      item.status === 'released' ? 'bg-emerald-500/10 text-emerald-500' :
                      item.status === 'returned' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-amber-500/10 text-amber-500'
                    }`}>
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">
                        {item.qty_requested}x {item.item_id}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Requested by <span className="text-foreground font-medium">{item.borrower_id}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      {item.status}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(item.request_date), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col">
          <h2 className="text-xl font-bold font-heading mb-6">Quick Actions</h2>
          <div className="flex-1 flex flex-col justify-center space-y-4">
            <Link 
              href="/pos"
              className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 hover:border-indigo-500/40 transition-colors group text-left"
            >
              <div>
                <p className="font-semibold text-foreground">Launch POS</p>
                <p className="text-sm text-muted-foreground">Open checkout interface</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
            <Link 
              href="/inventory"
              className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 hover:border-emerald-500/40 transition-colors group text-left"
            >
              <div>
                <p className="font-semibold text-foreground">Add Equipment</p>
                <p className="text-sm text-muted-foreground">Update inventory stock</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
