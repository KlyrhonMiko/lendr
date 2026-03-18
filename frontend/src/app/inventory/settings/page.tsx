'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Search, Loader2, AlertCircle, X, Sliders, Box, Warehouse } from 'lucide-react';
import { inventorySettingsApi, SettingsListParams, SystemSetting, SystemSettingCreate } from './api';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/lib/api';
import { toast } from 'sonner';

export default function InventorySettingsPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'borrower'>('inventory');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-heading mb-2">Inventory Settings</h1>
          <p className="text-muted-foreground text-lg">Configure inventory rules and borrower portal behavior.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-indigo-500 text-white font-semibold rounded-full hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4" />
          Update Setting
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-muted/30 w-fit rounded-2xl border border-border/50">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'inventory' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          Inventory Config
        </button>
        <button
          onClick={() => setActiveTab('borrower')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'borrower' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Box className="w-4 h-4" />
          Borrower Config
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search keys..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
            />
          </div>

          <input
            type="text"
            placeholder="Category..."
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium w-48"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
                <th className="p-4 pl-6">Key &amp; Description</th>
                <th className="p-4">Category</th>
                <th className="p-4 pr-6">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center">
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
                  <td className="p-4 pr-6">
                    <code className="text-sm px-2 py-1 rounded bg-muted font-mono border border-border/50 text-indigo-400">
                      {setting.value}
                    </code>
                  </td>
                </tr>
              ))}
              {!loading && settings.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-muted-foreground">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    No configuration settings found for {activeTab}.
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h2 className="text-xl font-bold font-heading">Update {activeTab === 'inventory' ? 'Inventory' : 'Borrower'} Param</h2>
              <button onClick={resetForm} className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Setting Key</label>
                <input
                  required
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-mono text-sm"
                  placeholder="e.g. min_borrow_days"
                />
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

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl font-semibold bg-secondary hover:bg-secondary/80 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-semibold bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 transition-colors">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
