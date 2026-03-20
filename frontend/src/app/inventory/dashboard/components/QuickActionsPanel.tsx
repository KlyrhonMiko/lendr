import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export function QuickActionsPanel() {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border flex flex-col">
      <h2 className="text-xl font-bold font-heading mb-6">Quick Actions</h2>
      <div className="flex-1 flex flex-col justify-center space-y-4">
        <Link
          href="/inventory/items"
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
  );
}

