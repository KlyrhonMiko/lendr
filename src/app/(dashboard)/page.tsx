import { Package, Users, Activity, Box, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
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
        {[
          { label: "Total Equipment", value: "24", icon: Package, trend: "+2", color: "from-blue-500/20 to-cyan-500/20" },
          { label: "Items Borrowed", value: "8", icon: Activity, trend: "-1", color: "from-purple-500/20 to-pink-500/20" },
          { label: "Active Users", value: "12", icon: Users, trend: "+4", color: "from-orange-500/20 to-amber-500/20" },
          { label: "Low Stock Items", value: "3", icon: Box, trend: "Status", color: "from-rose-500/20 to-red-500/20" },
        ].map((stat, i) => (
          <div key={i} className="relative p-6 rounded-2xl bg-card border border-border overflow-hidden group hover:border-indigo-500/50 transition-colors">
            <div className={`absolute inset-0 bg-gradient-to-br opacity-50 ${stat.color} translate-y-[2px]`} />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-background rounded-xl border border-border">
                  <stat.icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.trend}
                </div>
              </div>
              <h3 className="text-4xl font-bold font-heading tracking-tight mb-1">{stat.value}</h3>
              <p className="text-muted-foreground font-medium">{stat.label}</p>
            </div>
            
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-indigo-500/20 rounded-2xl transition-colors pointer-events-none" />
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-heading">Recent Transactions</h2>
            <Link href="/borrows" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">View All</Link>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 text-center bg-background rounded-xl border border-border/50 border-dashed">
              <p className="text-muted-foreground text-sm font-medium">No recent transactions</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col">
          <h2 className="text-xl font-bold font-heading mb-6">Quick Actions</h2>
          <div className="flex-1 flex flex-col justify-center space-y-4">
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 hover:border-indigo-500/40 transition-colors group text-left">
              <div>
                <p className="font-semibold text-foreground">Scan Equipment</p>
                <p className="text-sm text-muted-foreground">Use barcode scanner</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 hover:border-emerald-500/40 transition-colors group text-left">
              <div>
                <p className="font-semibold text-foreground">Generate Report</p>
                <p className="text-sm text-muted-foreground">Export monthly statistics</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
