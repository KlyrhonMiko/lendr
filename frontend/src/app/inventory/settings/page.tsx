'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { inventorySettingsApi, SettingsListParams } from './api';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/lib/api';
import { toast } from 'sonner';
import type { SystemSettingFormData, SystemSetting } from './lib/types';
import type { InventorySettingsTab } from './components/InventorySettingsTabs';
import { InventorySettingsHeader } from './components/InventorySettingsHeader';
import { InventorySettingsTabs } from './components/InventorySettingsTabs';
import { InventorySettingsToolbar } from './components/InventorySettingsToolbar';
import { InventorySettingsTable } from './components/InventorySettingsTable';
import { UpdateSettingModal } from './components/UpdateSettingModal';

export default function InventorySettingsPage() {
  const [activeTab, setActiveTab] = useState<InventorySettingsTab>('inventory');
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [formData, setFormData] = useState<SystemSettingFormData>({
    key: '',
    value: '',
    category: 'general',
    description: '',
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: SettingsListParams = {
        page,
        per_page: perPage,
        key: search || undefined,
        category: categoryFilter || undefined,
      };
      
      const res = activeTab === 'inventory' 
        ? await inventorySettingsApi.listInventory(params)
        : await inventorySettingsApi.listBorrower(params);
        
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
    setPage(1);
  }, [activeTab, search, categoryFilter]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const resetForm = () => {
    setFormData({ key: '', value: '', category: 'general', description: '' });
    setIsModalOpen(false);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (activeTab === 'inventory') {
        await inventorySettingsApi.createInventory(formData);
      } else {
        await inventorySettingsApi.createBorrower(formData);
      }
      toast.success('Configuration updated');
      resetForm();
      fetchSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save setting';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <InventorySettingsHeader onUpdate={() => setIsModalOpen(true)} />

      <InventorySettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <InventorySettingsToolbar
          search={search}
          onSearchChange={setSearch}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
        />

        <InventorySettingsTable settings={settings} loading={loading} activeTab={activeTab} />

        {meta && (
          <Pagination meta={meta} onPageChange={setPage} onPerPageChange={setPerPage} />
        )}
      </div>

      {isModalOpen && (
        <UpdateSettingModal
          activeTab={activeTab}
          formData={formData}
          setFormData={setFormData}
          onClose={resetForm}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}
