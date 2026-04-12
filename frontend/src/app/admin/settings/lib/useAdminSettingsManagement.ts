'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { type ActiveTab, type SettingsListParams, type SystemSetting, type SystemSettingCreate } from '../api';
import { useDebounce } from './useDebounce';

import { useAdminSettings, useAdminSettingLookups, useAdminSettingMutations, useAuthConfigurations } from './useSettingsQueries';

const DEFAULT_PER_PAGE = 10;


export function useAdminSettingsManagement() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('health');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [systemFilter, setSystemFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  const debouncedSearch = useDebounce(search, 400);
  const debouncedCategory = useDebounce(categoryFilter, 400);
  const debouncedSystem = useDebounce(systemFilter, 400);

  const params: SettingsListParams = {
    page,
    per_page: perPage,
    search: debouncedSearch || undefined,
    category: debouncedCategory || undefined,
    system: debouncedSystem || undefined,
  };

  // Queries
  const {
    data: dictionaryRes,
    isLoading: dictionaryLoading,
    error: dictionaryError
  } = useAdminSettings(params);

  const {
    data: authRes,
    isLoading: authLoading,
    error: authError
  } = useAuthConfigurations(params);

  const { data: lookupData } = useAdminSettingLookups();

  // Mutations
  const { updateSetting, createAuthSetting, deleteSetting, restoreSetting } = useAdminSettingMutations();

  const settings = activeTab === 'dictionary' ? dictionaryRes?.data || [] : authRes?.data || [];
  const meta = activeTab === 'dictionary' ? dictionaryRes?.meta || null : authRes?.meta || null;
  const loading = activeTab === 'dictionary' ? dictionaryLoading : authLoading;
  const error = (activeTab === 'dictionary' ? dictionaryError : authError)?.message || null;

  const categories = lookupData?.categories || [];
  const systems = lookupData?.systems || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreData, setRestoreData] = useState({ key: '', category: 'general' });

  const [formData, setFormData] = useState<SystemSettingCreate & { description: string }>({
    key: '',
    value: '',
    category: 'general',
    description: '',
  });

  const resetForm = useCallback(() => {
    setFormData({ key: '', value: '', category: 'general', description: '' });
    setEditingKey(null);
    setIsModalOpen(false);
  }, []);

  const openEditModal = useCallback((setting: SystemSetting) => {
    if (setting.crucial) {
      toast.error('Required settings cannot be edited from UI.');
      return;
    }

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
      try {
        if (editingKey && activeTab === 'dictionary') {
          await updateSetting.mutateAsync({ key: editingKey, value: formData.value, category: formData.category });
        } else if (activeTab === 'security') {
          await createAuthSetting.mutateAsync(formData);
        } else {
          toast.success('Settings saved');
        }
        resetForm();
      } catch {
        // Error toast handled in mutation
      }
    },
    [activeTab, editingKey, formData, resetForm, updateSetting, createAuthSetting]
  );

  const handleDelete = useCallback(
    async (key: string, category: string) => {
      if (!confirm(`Are you sure you want to delete "${key}" from "${category}"?`)) return;
      deleteSetting.mutate({ key, category });
    },
    [deleteSetting]
  );

  const handleRestore = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      restoreSetting.mutate({ key: restoreData.key, category: restoreData.category }, {
        onSuccess: () => {
          setIsRestoreModalOpen(false);
          setRestoreData({ key: '', category: 'general' });
        }
      });
    },
    [restoreData.category, restoreData.key, restoreSetting]
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
