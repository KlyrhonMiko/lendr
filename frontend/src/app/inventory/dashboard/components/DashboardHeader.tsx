import Link from 'next/link';
import { Package } from 'lucide-react';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export function DashboardHeader() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{today}</p>
        <h1 className="text-3xl font-bold font-heading tracking-tight">
          {greeting()}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your inventory today.
        </p>
      </div>
      <div className="flex items-center gap-3 mt-4 sm:mt-0">
        <Link
          href="/inventory/items"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Package className="w-3.5 h-3.5" />
          Manage Inventory
        </Link>
      </div>
    </div>
  );
}
