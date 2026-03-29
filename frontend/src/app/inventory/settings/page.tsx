'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { inventorySettingsApi, SettingsListParams } from './api';
import type { PaginationMeta } from '@/lib/api';
import { toast } from 'sonner';
import type { SystemSetting } from './lib/types';
import type { InventorySettingsTab } from './components/InventorySettingsTabs';
import { InventorySettingsHeader } from './components/InventorySettingsHeader';
import { InventorySettingsTabs } from './components/InventorySettingsTabs';
import { AlertSettings } from './components/AlertSettings';
import { ImportExportSettings } from './components/ImportExportSettings';
import { DictionarySettings } from './components/DictionarySettings';

export default function InventorySettingsPage() {
  const [activeTab, setActiveTab] = useState<InventorySettingsTab>('system');
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dictionary Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const fetchSettings = useCallback(async () => {
    if (activeTab !== 'dictionary') return;
    
    setLoading(true);
    setError(null);
    try {
      const params: SettingsListParams = {
        page,
        per_page: perPage,
        key: search || undefined,
        category: categoryFilter || undefined,
      };
      
      // For dictionary, we fetch from inventory config by default
      const res = await inventorySettingsApi.listInventory(params);
        
      setSettings(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, categoryFilter, page, perPage]);

  useEffect(() => {
    if (activeTab === 'dictionary') {
      fetchSettings();
    }
  }, [fetchSettings, activeTab]);

  const handleDelete = async (key: string, category: string) => {
    toast.success(`Deleted ${key} from ${category}`);
    // Refresh settings in real implementation
    fetchSettings();
  };

  const handleEdit = (setting: SystemSetting) => {
    toast.info(`Editing ${setting.key}`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <InventorySettingsHeader />

      <InventorySettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="min-h-[600px]">
        {activeTab === 'system' && <AlertSettings />}
        
        {activeTab === 'import-export' && <ImportExportSettings />}
        
        {activeTab === 'dictionary' && (
          <DictionarySettings 
            settings={settings}
            loading={loading}
            meta={meta}
            categories={['inventory', 'borrower', 'general', 'alerts']}
            search={search}
            onSearchChange={setSearch}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
