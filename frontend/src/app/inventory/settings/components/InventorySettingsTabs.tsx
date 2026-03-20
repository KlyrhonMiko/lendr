'use client';

import { Box, Warehouse } from 'lucide-react';

export type InventorySettingsTab = 'inventory' | 'borrower';

export function InventorySettingsTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: InventorySettingsTab;
  onTabChange: (tab: InventorySettingsTab) => void;
}) {
  return (
    <div className="flex gap-1 p-1 bg-muted/30 w-fit rounded-2xl border border-border/50">
      <button
        onClick={() => onTabChange('inventory')}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
          activeTab === 'inventory'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        type="button"
      >
        <Warehouse className="w-4 h-4" />
        Inventory Config
      </button>
      <button
        onClick={() => onTabChange('borrower')}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
          activeTab === 'borrower'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        type="button"
      >
        <Box className="w-4 h-4" />
        Borrower Config
      </button>
    </div>
  );
}

