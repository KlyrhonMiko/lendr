'use client';

import { Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';


export function InventoryItemsHeader({
  onAdd,
  kind
}: {
  onAdd: () => void;
  kind: 'equipments' | 'materials';
}) {
  const isEquipments = kind === 'equipments';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center text-primary">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">
            {isEquipments ? 'Equipment Catalog' : 'Materials Inventory'}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isEquipments
              ? 'Manage and track all your equipment in one place'
              : 'Keep track of consumable supplies and materials'}
          </p>
        </div>
      </div>
      <Button
        onClick={onAdd}
        className="rounded-xl shadow-md shadow-primary/20"
      >
        <Plus className="w-5 h-5 mr-1" />
        Add {isEquipments ? 'Equipment' : 'Material'}
      </Button>

    </div>
  );
}
