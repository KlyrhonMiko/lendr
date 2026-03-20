'use client';

import { Search, Sliders, Users } from 'lucide-react';

type ActiveTab = 'platform' | 'auth' | 'lookup';

export function SettingsTabs({ activeTab, onTabChange }: { activeTab: ActiveTab; onTabChange: (t: ActiveTab) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-muted/30 w-fit rounded-2xl border border-border/50">
      <button
        onClick={() => onTabChange('platform')}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
          activeTab === 'platform' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Sliders className="w-4 h-4" />
        Platform Config
      </button>
      <button
        onClick={() => onTabChange('auth')}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
          activeTab === 'auth' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Users className="w-4 h-4" />
        Auth Config
      </button>
      <button
        onClick={() => onTabChange('lookup')}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
          activeTab === 'lookup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Search className="w-4 h-4" />
        System Lookup
      </button>
    </div>
  );
}

