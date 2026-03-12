'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Search, Edit2, Loader2, AlertCircle, X, Shield, Sliders } from 'lucide-react';
import { api } from '@/lib/api';

interface SystemSetting {
  key: string;
  value: string;
  category: string;
  description: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    category: 'general',
    description: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get<SystemSetting[]>('/config');
      setSettings(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      key: '',
      value: '',
      category: 'general',
      description: '',
    });
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
      if (editingKey) {
        // Backend PATCH /{key} only takes { value } based on schema
        await api.patch(`/config/${editingKey}`, { value: formData.value });
      } else {
        await api.post('/config', formData);
      }
      resetForm();
      fetchSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to save setting');
    }
  };

  const filteredSettings = settings.filter(s => 
    s.key.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-heading mb-2">System Configuration</h1>
          <p className="text-muted-foreground text-lg">Manage global application settings and workflows.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-indigo-500 text-white font-semibold rounded-full hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4" />
          New Setting
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search settings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
                <th className="p-4 pl-6">Key & Description</th>
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
              ) : filteredSettings.map((setting) => (
                <tr key={setting.key} className="hover:bg-muted/30 transition-colors group">
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
                    <button onClick={() => openEditModal(setting)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredSettings.length === 0 && (
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
      </div>

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
              )}

              {!editingKey && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full h-24 p-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium resize-none"
                    placeholder="What does this setting control?"
                  />
                </div>
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
    </div>
  );
}
