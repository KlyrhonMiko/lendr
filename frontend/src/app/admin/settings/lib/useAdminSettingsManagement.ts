'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { PaginationMeta } from '@/lib/api';
import { settingsApi, type SettingsListParams, type SystemSetting, type SystemSettingCreate } from '../api';
import { useDebounce } from './useDebounce';

const DEFAULT_PER_PAGE = 10;

type ActiveTab = 'general' | 'system' | 'operations' | 'health' | 'security' | 'dictionary';

export function useAdminSettingsManagement() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('health');

  // Lookup state
  const [categories, setCategories] = useState<string[]>([]);
  const [systems, setSystems] = useState<string[]>([]);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreData, setRestoreData] = useState({ key: '', category: 'general' });

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [systemFilter, setSystemFilter] = useState('');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  const debouncedSearch = useDebounce(search, 400);
  const debouncedCategory = useDebounce(categoryFilter, 400);
  const debouncedSystem = useDebounce(systemFilter, 400);

  const [formData, setFormData] = useState<SystemSettingCreate & { description: string }>({
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
        search: debouncedSearch || undefined,
        category: debouncedCategory || undefined,
        system: debouncedSystem || undefined,
      };

      const res =
        activeTab === 'dictionary' ? await settingsApi.list(params) : await settingsApi.listAuth(params);

      setSettings(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch, debouncedCategory, debouncedSystem, activeTab]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedCategory, debouncedSystem, perPage, activeTab]);

  const fetchLookups = useCallback(async () => {
    try {
      const [catRes, sysRes] = await Promise.all([
        settingsApi.listCategories(),
        settingsApi.listSystems(),
      ]);
      setCategories(catRes.data);
      setSystems(sysRes.data);
    } catch (err) {
      toast.error('Failed to fetch filter options');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'dictionary') {
      fetchLookups();
      fetchSettings();
    }
  }, [fetchSettings, fetchLookups, activeTab]);

  const resetForm = useCallback(() => {
    setFormData({ key: '', value: '', category: 'general', description: '' });
    setEditingKey(null);
    setIsModalOpen(false);
    setError(null);
  }, []);

  const openEditModal = useCallback((setting: SystemSetting) => {
    setEditingKey(setting.key);
    setFormData({
      key: setting.key,
      value: setting.value,
      category: setting.category,
      description: setting.description || '',
    });
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      try {
        if (editingKey && activeTab === 'dictionary') {
          await settingsApi.update(editingKey, formData.value, formData.category);
          toast.success('System setting updated');
        } else if (activeTab === 'security') {
          await settingsApi.createAuth(formData);
          toast.success('Auth configuration updated');
        } else {
          // Placeholder for other tabs
          toast.success('Settings saved');
        }

        resetForm();
        fetchSettings();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save setting';
        setError(msg);
        toast.error(msg);
      }
    },
    [activeTab, editingKey, fetchSettings, formData, resetForm]
  );

  const handleDelete = useCallback(
    async (key: string, category: string) => {
      if (!confirm(`Are you sure you want to delete "${key}" from "${category}"?`)) return;
      try {
        await settingsApi.delete(key, category);
        toast.success('Setting deleted');
        fetchSettings();
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete setting');
      }
    },
    [fetchSettings]
  );

  const handleRestore = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await settingsApi.restore(restoreData.key, restoreData.category);
        toast.success('Setting restored successfully');
        setIsRestoreModalOpen(false);
        setRestoreData({ key: '', category: 'general' });
        fetchSettings();
      } catch (err: any) {
        toast.error(err.message || 'Failed to restore setting');
      }
    },
    [fetchSettings, restoreData.category, restoreData.key]
  );

  const openRestoreModal = useCallback(() => setIsRestoreModalOpen(true), []);
  const openEditModalForNew = useCallback(() => {
    setEditingKey(null);
    setFormData({ key: '', value: '', category: 'general', description: '' });
    setIsModalOpen(true);
  }, []);

  const closeRestoreModal = useCallback(() => setIsRestoreModalOpen(false), []);

  return {
    // Data
    settings,
    meta,
    loading,
    error,

    // Navigation
    activeTab,
    setActiveTab,

    // Modal
    isModalOpen,
    editingKey,
    isRestoreModalOpen,
    // Lookup state
    categories,
    systems,
    formData,
    setFormData,
    restoreData,
    setRestoreData,

    // Filters
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    systemFilter,
    setSystemFilter,
    page,
    setPage,
    perPage,
    setPerPage,

    // Actions
    resetForm,
    openEditModal,
    handleSave,
    handleDelete,
    handleRestore,


    // Restore open/close
    openRestoreModal,
    closeRestoreModal,

    // Open edit (for "Update Param")
    openEditModalForNew,
  };
}
