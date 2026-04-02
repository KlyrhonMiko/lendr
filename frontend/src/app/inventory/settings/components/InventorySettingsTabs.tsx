import { Bell, FileBarChart, BookOpen } from 'lucide-react';

export type InventorySettingsTab = 'system' | 'import-export' | 'dictionary';

export function InventorySettingsTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: InventorySettingsTab;
  onTabChange: (tab: InventorySettingsTab) => void;
}) {
  const tabs = [
    { id: 'system', label: 'System Settings', icon: Bell },
    { id: 'import-export', label: 'Import & Export', icon: FileBarChart },
    { id: 'dictionary', label: 'Data Dictionary', icon: BookOpen },
  ] as const;

  return (
    <div className="flex flex-wrap gap-1 p-1 bg-muted/30 w-fit rounded-2xl border border-border/50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as InventorySettingsTab)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            type="button"
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

