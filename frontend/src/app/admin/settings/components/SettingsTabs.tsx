'use client';

import { Activity, BookOpen, Globe, Monitor, Settings, Shield } from 'lucide-react';

type ActiveTab = 'general' | 'system' | 'operations' | 'health' | 'security' | 'dictionary';

export function SettingsTabs({ activeTab, onTabChange }: { activeTab: ActiveTab; onTabChange: (t: ActiveTab) => void }) {
  const tabs = [
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'general', label: 'General Settings', icon: Globe },
    { id: 'system', label: 'Platform Branding', icon: Monitor },
    { id: 'operations', label: 'System Operations', icon: Settings },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'dictionary', label: 'Data Dictionary', icon: BookOpen },
  ] as const;

  return (
    <div className="flex flex-wrap gap-1 p-1.5 bg-secondary/30 w-fit rounded-lg border border-border/50 shadow-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-background text-primary shadow-sm border border-border/50'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

