'use client';

import { Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';


export function InventoryItemsHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center text-primary">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">Equipment Catalog</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage and track all your equipment in one place</p>
        </div>
      </div>
      <Button
        onClick={onAdd}
        className="rounded-xl shadow-md shadow-primary/20"
      >
        <Plus className="w-5 h-5 mr-1" />
        Add Equipment
      </Button>

    </div>
  );
}
