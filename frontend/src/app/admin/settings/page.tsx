'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Search, Edit2, Loader2, AlertCircle, X, Sliders, Users, RefreshCw, Trash2, Tag, Database } from 'lucide-react';
import { settingsApi, SettingsListParams } from './api';
import type { SystemSetting, SystemSettingCreate } from './api';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/lib/api';
import { toast } from 'sonner';

const DEFAULT_PER_PAGE = 10;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'platform' | 'auth' | 'lookup'>('platform');

  // Lookup State
  const [categories, setCategories] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreData, setRestoreData] = useState({ key: '', category: 'general' });

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  const debouncedSearch = useDebounce(search, 400);
  const debouncedCategory = useDebounce(categoryFilter, 400);

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
      };
      const res = activeTab === 'platform'
        ? await settingsApi.list(params)
        : await settingsApi.listAuth(params);
        
      setSettings(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch, debouncedCategory, activeTab]);

  const fetchLookupData = useCallback(async () => {
    if (activeTab !== 'lookup') return;
    setLoading(true);
    try {
      const [catRes, tabRes] = await Promise.all([
        settingsApi.listCategories(),
        settingsApi.listTables()
      ]);
      setCategories(catRes.data);
      setTables(tabRes.data);
    } catch (err: any) {
      toast.error('Failed to fetch lookup metadata');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchColumns = async (tableName: string) => {
    setSelectedTable(tableName);
    try {
      const res = await settingsApi.listTableColumns(tableName);
      setColumns(res.data);
    } catch (err) {
      toast.error(`Failed to fetch columns for ${tableName}`);
    }
  };

  useEffect(() => { setPage(1); }, [debouncedSearch, debouncedCategory, perPage, activeTab]);
  useEffect(() => { 
    if (activeTab === 'lookup') {
      fetchLookupData();
    } else {
      fetchSettings(); 
    }
  }, [fetchSettings, fetchLookupData, activeTab]);

  const resetForm = () => {
    setFormData({ key: '', value: '', category: 'general', description: '' });
    setEditingKey(null);
    setIsModalOpen(false);
    setError(null);
  };

  const openEditModal = (setting: SystemSetting) => {
    setEditingKey(setting.key);
    setFormData({
      key: setting.key,
      value: setting.value,
      category: setting.category,
      description: setting.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingKey && activeTab === 'platform') {
        await settingsApi.update(editingKey, formData.value, formData.category);
        toast.success('System setting updated');
      } else if (activeTab === 'auth') {
        await settingsApi.createAuth(formData);
        toast.success('Auth configuration updated');
      } else {
        await settingsApi.create(formData);
        toast.success('New configuration added');
      }
      resetForm();
      fetchSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save setting';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleDelete = async (key: string, category: string) => {
    if (!confirm(`Are you sure you want to delete "${key}" from "${category}"?`)) return;
    try {
      await settingsApi.delete(key, category);
      toast.success('Setting deleted');
      fetchSettings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete setting');
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
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
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-heading mb-2">System Administration</h1>
          <p className="text-muted-foreground text-lg">Manage platform-level configurations and system-wide parameters.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsRestoreModalOpen(true)}
            className="px-6 py-2.5 bg-secondary text-foreground font-semibold rounded-full hover:bg-secondary/80 transition-all flex items-center gap-2 border border-border"
          >
            <RefreshCw className="w-4 h-4" />
            Restore Setting
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-indigo-500 text-white font-semibold rounded-full hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25"
          >
            <Plus className="w-4 h-4" />
            Update Param
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-muted/30 w-fit rounded-2xl border border-border/50">
        <button
          onClick={() => setActiveTab('platform')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'platform' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Platform Config
        </button>
        <button
          onClick={() => setActiveTab('auth')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'auth' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Auth Config
        </button>
        <button
          onClick={() => setActiveTab('lookup')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'lookup' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="w-4 h-4" />
          System Lookup
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      {activeTab !== 'lookup' ? (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          {/* Toolbar */}
          <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by key or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
            />
          </div>

          <input
            type="text"
            placeholder="Filter by category..."
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium w-48"
          />

          {meta && (
            <span className="ml-auto text-sm text-muted-foreground font-medium">
              {meta.total} setting{meta.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
                <th className="p-4 pl-6">Key &amp; Description</th>
                <th className="p-4">Category</th>
                <th className="p-4">Value</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">Loading parameters...</p>
                  </td>
                </tr>
              ) : settings.map((setting) => (
                <tr key={`${setting.category}-${setting.key}`} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-4 pl-6 max-w-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground font-mono text-sm">{setting.key}</span>
                        <span className="text-xs text-muted-foreground line-clamp-1">{setting.description || 'No description provided.'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-secondary text-secondary-foreground border border-border">
                      {setting.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <code className="text-sm px-2 py-1 rounded bg-muted font-mono border border-border/50 text-indigo-400">
                      {setting.value}
                    </code>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEditModal(setting)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(setting.key, setting.category)} className="p-2 hover:bg-rose-500/10 rounded-lg text-muted-foreground hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && settings.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-muted-foreground">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    No configuration settings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

          {meta && (
            <Pagination
              meta={meta}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Categories */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-xl font-bold font-heading flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-400" />
              Active Categories
            </h2>
            <div className="bg-card border border-border rounded-3xl p-4 shadow-sm max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading...</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-indigo-500/10 hover:text-indigo-400 border border-border transition-all text-xs font-bold"
                    >
                      {cat}
                    </button>
                  ))}
                  {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories found.</p>}
                </div>
              )}
            </div>
          </div>

          {/* Database Schema Explorer */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold font-heading flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Schema Explorer
            </h2>
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row min-h-[400px]">
              <div className="w-full md:w-64 border-r border-border bg-muted/20 p-4 space-y-2 overflow-y-auto max-h-[600px]">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Tables</p>
                {tables.map(table => (
                  <button
                    key={table}
                    onClick={() => fetchColumns(table)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedTable === table ? 'bg-background text-indigo-400 shadow-sm border border-border' : 'hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {table}
                  </button>
                ))}
              </div>
              <div className="flex-1 p-6">
                {selectedTable ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold font-mono text-emerald-400">{selectedTable}</h3>
                      <span className="text-xs text-muted-foreground">{columns.length} columns found</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {columns.map(col => (
                        <div key={col} className="p-3 rounded-2xl bg-muted/30 border border-border/50 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-sm font-medium font-mono">{col}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                    <Database className="w-12 h-12 opacity-10" />
                    <p className="text-sm font-medium italic">Select a table to view its schema.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h2 className="text-xl font-bold font-heading">{editingKey ? 'Edit Setting' : 'New Configuration'}</h2>
              <button onClick={resetForm} className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Setting Key</label>
                <input
                  required
                  disabled={!!editingKey}
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-mono text-sm disabled:opacity-50"
                  placeholder="e.g. system_name"
                />
                {!editingKey && <p className="text-[10px] text-muted-foreground italic">Keys cannot be changed after creation.</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Value</label>
                <input
                  required
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                />
              </div>

              {!editingKey && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                      placeholder="general"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full h-24 p-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium resize-none"
                      placeholder="What does this setting control?"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl font-semibold bg-secondary hover:bg-secondary/80 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-semibold bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 transition-colors">
                  {editingKey ? 'Update Value' : 'Create Setting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h2 className="text-xl font-bold font-heading">Restore Deleted Setting</h2>
              <button onClick={() => setIsRestoreModalOpen(false)} className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestore} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Setting Key</label>
                <input
                  required
                  type="text"
                  value={restoreData.key}
                  onChange={(e) => setRestoreData({ ...restoreData, key: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-mono text-sm"
                  placeholder="e.g. system_name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Category</label>
                <input
                  required
                  type="text"
                  value={restoreData.category}
                  onChange={(e) => setRestoreData({ ...restoreData, category: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsRestoreModalOpen(false)} className="flex-1 py-3 rounded-xl font-semibold bg-secondary hover:bg-secondary/80 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-semibold bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 transition-colors flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Restore Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
