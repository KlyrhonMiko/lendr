import Link from 'next/link';
import { Package } from 'lucide-react';

export function DashboardHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold font-heading mb-2">Inventory Overview</h1>
        <p className="text-muted-foreground text-lg">Detailed metrics and recent equipment movement.</p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/inventory/items"
          className="px-6 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-full border border-border hover:bg-secondary/80 transition-all flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          Manage Inventory
        </Link>
      </div>
    </div>
  );
}

