'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  BookOpen,
  Layers,
  Lock,
  Key as KeyIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormSelect } from '@/components/ui/form-select';
import { toast } from 'sonner';
import type { SystemSetting, SystemSettingCreate } from '../lib/types';
import type { PaginationMeta } from '@/lib/api';
import { Pagination } from '@/components/ui/Pagination';

interface DictionarySettingsProps {
  settings: SystemSetting[];
  loading: boolean;
  meta: PaginationMeta | null;
  categories: string[];
  search: string;
  onSearchChange: (val: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (val: string) => void;
  onPageChange: (page: number) => void;
  onDelete: (key: string, category: string) => void;
  onAdd: (data: SystemSettingCreate) => Promise<void>;
}

export function DictionarySettings({
  settings,
  loading,
  meta,
  categories,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  onPageChange,
  onDelete,
  onAdd
}: DictionarySettingsProps) {
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<SystemSetting>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Entry State
  const [newEntry, setNewEntry] = useState<SystemSettingCreate>({
    category: categories[0] || 'inventory_category',
    key: '',
    value: '',
    description: ''
  });

  const handleStartEdit = (setting: SystemSetting) => {
    if (setting.crucial) {
      toast.error('Required settings cannot be edited from UI.');
      return;
    }

    setEditingRow(`${setting.category}-${setting.key}`);
    setEditData(setting);
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleSaveEdit = () => {
    onAdd({
      category: editData.category!,
      key: editData.key!,
      value: editData.value!,
      description: editData.description || undefined
    });
    setEditingRow(null);
  };

  const handleDelete = (setting: SystemSetting) => {
    if (setting.crucial) {
      toast.error('Required settings cannot be deleted.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${setting.key}"?`)) {
      onDelete(setting.key, setting.category);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-1 w-full max-w-2xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Search dictionary keys or values..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-2xl bg-muted/20 border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm outline-none"
            />
          </div>
          <div className="w-56">
            <FormSelect
              value={categoryFilter}
              onChange={(v) => onCategoryFilterChange(v || '')}
              options={[
                { label: 'All Categories', key: '' },
                ...categories.map(c => ({ label: c, key: c }))
              ]}
              placeholder="All Categories"
            />
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add New Entry
        </button>
      </div>

      {/* Adding New Entry Card (Form) */}
      {isAdding && (
        <Card className="border-primary/30 bg-primary/5 shadow-xl shadow-primary/5 animate-in slide-in-from-top-4">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Plus className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg">New Dictionary Entry</CardTitle>
            </div>
            <button
              onClick={() => setIsAdding(false)}
              aria-label="Close new entry form"
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-1">
              <FormSelect
                label="Category"
                value={newEntry.category || ''}
                onChange={(v) => setNewEntry({ ...newEntry, category: v || '' })}
                options={categories.map(c => ({ label: c, key: c }))}
                placeholder="Select category"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground ml-1">Key Name</label>
              <Input
                placeholder="e.g. MIN_STOCK_WARN"
                value={newEntry.key}
                onChange={(e) => setNewEntry({ ...newEntry, key: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground ml-1">Value</label>
              <Input
                placeholder="e.g. 10"
                value={newEntry.value}
                onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
              />
            </div>
          </CardContent>
          <div className="px-6 py-4 border-t border-primary/10 flex justify-end gap-3">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!newEntry.key || !newEntry.value) {
                  toast.error('Key and Value are required');
                  return;
                }
                setIsSubmitting(true);
                try {
                  await onAdd(newEntry);
                  setIsAdding(false);
                  setNewEntry({ ...newEntry, key: '', value: '' });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </Card>
      )}

      {/* Table Container */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
                <th className="p-4 pl-8">Key</th>
                <th className="p-4">Category</th>
                <th className="p-4">Value</th>
                <th className="p-4">Last Modified</th>
                <th className="p-4 pr-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Loading dictionary...
                    </div>
                  </td>
                </tr>
              ) : settings.map((setting) => {
                const isEditing = editingRow === `${setting.category}-${setting.key}`;

                return (
                  <tr key={`${setting.category}-${setting.key}`} className="hover:bg-muted/30 transition-colors group">
                    <td className="p-4 pl-8">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                          <KeyIcon className="w-4 h-4" />
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.key}
                            className="bg-muted px-2 py-1 rounded border border-border text-sm font-mono w-full"
                            onChange={(e) => setEditData({ ...editData, key: e.target.value })}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground font-mono text-sm">{setting.key}</span>
                            {setting.crucial && (
                              <span className="inline-flex items-center gap-1 rounded-full border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                                <Lock className="h-3 w-3" />
                                Required
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold border border-border uppercase tracking-widest leading-none">
                        <Layers className="w-3 h-3" />
                        {setting.category}
                      </span>
                    </td>
                    <td className="p-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.value}
                          className="bg-muted px-2 py-1 rounded border border-border text-sm font-mono w-full"
                          onChange={(e) => setEditData({ ...editData, value: e.target.value })}
                        />
                      ) : (
                        <code className="text-sm px-2.5 py-1.5 rounded-xl bg-muted/50 font-mono border border-border/50 text-primary">
                          {setting.value}
                        </code>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">2024-03-28</span>
                        <span className="text-[10px] text-muted-foreground">by Admin</span>
                      </div>
                    </td>
                    <td className="p-4 pr-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              aria-label="Save dictionary entry"
                              className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20 transition-all"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              aria-label="Cancel dictionary edit"
                              className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(setting)}
                              aria-label={`Edit ${setting.key}`}
                              className="w-8 h-8 rounded-lg text-muted-foreground flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                              title={setting.crucial ? 'Required setting cannot be edited from UI' : `Edit ${setting.key}`}
                              disabled={setting.crucial}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(setting)}
                              aria-label={`Delete ${setting.key}`}
                              className="w-8 h-8 rounded-lg text-muted-foreground flex items-center justify-center hover:bg-rose-500/10 hover:text-rose-500 transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                              title={setting.crucial ? 'Required setting cannot be deleted' : `Delete ${setting.key}`}
                              disabled={setting.crucial}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && settings.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    No dictionary entries found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {meta && (
          <Pagination
            meta={meta}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </div>
  );
}
