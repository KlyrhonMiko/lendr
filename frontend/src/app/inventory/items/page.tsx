'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Search, Edit2, Trash2, X, AlertCircle, Loader2, Filter, History as HistoryIcon, ShieldCheck, Activity, Layers } from 'lucide-react';
import { inventoryApi, InventoryItem, InventoryListParams, ConfigRead } from './api';
import { UnitManagement } from './UnitManagement';
import { BatchManagement } from './BatchManagement';
import { ItemHistory } from './ItemHistory';
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

export default function InventoryPage() {
  // List state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const debouncedCategory = useDebounce(categoryFilter, 400);

  // CRUD modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    classification: '',
    item_type: '',
    is_trackable: false,
    condition: '',
    description: '',
  });
  const [classifications, setClassifications] = useState<ConfigRead[]>([]);
  const [itemTypes, setItemTypes] = useState<ConfigRead[]>([]);
  const [conditions, setConditions] = useState<ConfigRead[]>([]);
  const [categories, setCategories] = useState<ConfigRead[]>([]);

  const [unitManagementItemId, setUnitManagementItemId] = useState<string | null>(null);
  const [batchManagementItemId, setBatchManagementItemId] = useState<string | null>(null);
  const [itemHistoryItemId, setItemHistoryItemId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: InventoryListParams = {
        page,
        per_page: perPage,
        search: debouncedSearch || undefined,
        category: debouncedCategory || undefined,
        classification: classificationFilter || undefined,
        item_type: itemTypeFilter || undefined,
        condition: conditionFilter || undefined,
      };
      const res = await inventoryApi.list(params);
      setItems(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch inventory';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch, debouncedCategory, itemTypeFilter, conditionFilter]);

  // Reset page to 1 whenever any filter changes (but not when page itself changes)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedCategory, classificationFilter, itemTypeFilter, conditionFilter, perPage]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const [classRes, typeRes, condRes, catRes] = await Promise.all([
          inventoryApi.getConfigs('inventory_classification'),
          inventoryApi.getConfigs('inventory_item_type'),
          inventoryApi.getConfigs('inventory_condition'),
          inventoryApi.getConfigs('inventory_category'),
        ]);
        setClassifications(classRes.data);
        setItemTypes(typeRes.data);
        setConditions(condRes.data);
        setCategories(catRes.data);
      } catch (err) {
        console.error('Failed to fetch configurations', err);
      }
    };
    fetchConfigs();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', category: '', classification: '', item_type: '', is_trackable: false, condition: '', description: '' });
    setEditingItem(null);
    setIsModalOpen(false);
    setError(null);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      classification: item.classification || '',
      item_type: item.item_type || '',
      is_trackable: item.is_trackable ?? false,
      condition: item.condition || '',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingItem) {
        await inventoryApi.update(editingItem.item_id, {
          name: formData.name,
          category: formData.category,
          classification: formData.classification || undefined,
          item_type: formData.item_type,
          is_trackable: formData.is_trackable,
          condition: formData.condition,
          description: formData.description || undefined,
        });
        toast.success('Equipment updated successfully');
      } else {
        await inventoryApi.create({
          name: formData.name,
          category: formData.category,
          classification: formData.classification || undefined,
          item_type: formData.item_type,
          is_trackable: formData.is_trackable,
          condition: formData.condition || undefined,
          description: formData.description || undefined,
        });
        toast.success('New equipment added to catalog');
      }
      resetForm();
      fetchItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save equipment';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;
    try {
      await inventoryApi.delete(itemId);
      toast.success('Item removed from inventory');
      fetchItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete';
      setError(msg);
      toast.error(msg);
    }
  };

  const hasActiveFilters = classificationFilter || itemTypeFilter || conditionFilter || debouncedCategory;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-heading mb-2">Inventory Management</h1>
          <p className="text-muted-foreground text-lg">Add, edit, and track your equipment catalog.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-indigo-500 text-white font-semibold rounded-full hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4" />
          Add Equipment
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-semibold transition-all ${
              hasActiveFilters
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-input/30 border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 rounded-full bg-indigo-400" />
            )}
          </button>

          {/* Inline category input */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm font-medium w-48 cursor-pointer appearance-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>{c.value}</option>
            ))}
          </select>

          {/* Count badge */}
          {meta && (
            <span className="ml-auto text-sm text-muted-foreground font-medium">
              {meta.total} item{meta.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="px-4 py-3 border-b border-border bg-background/30 flex items-center gap-3 flex-wrap animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold">Classification:</span>
              <select
                value={classificationFilter}
                onChange={(e) => setClassificationFilter(e.target.value)}
                className="h-8 px-3 rounded-lg bg-input/30 border border-border text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
              >
                <option value="">All classifications</option>
                {classifications.map((c) => (
                  <option key={c.key} value={c.key}>{c.key.charAt(0).toUpperCase() + c.key.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold">Item Type:</span>
              <select
                value={itemTypeFilter}
                onChange={(e) => setItemTypeFilter(e.target.value)}
                className="h-8 px-3 rounded-lg bg-input/30 border border-border text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
              >
                <option value="">All types</option>
                {itemTypes.map((t) => (
                  <option key={t.key} value={t.key}>{t.key.charAt(0).toUpperCase() + t.key.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold">Condition:</span>
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="h-8 px-3 rounded-lg bg-input/30 border border-border text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
              >
                <option value="">All conditions</option>
                {conditions.map((c) => (
                  <option key={c.key} value={c.key}>{c.key.charAt(0).toUpperCase() + c.key.slice(1)}</option>
                ))}
              </select>
            </div>

            {(classificationFilter || itemTypeFilter || conditionFilter) && (
              <button
                onClick={() => { setClassificationFilter(''); setItemTypeFilter(''); setConditionFilter(''); }}
                className="ml-auto text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear filters
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-background/30 font-semibold font-heading">
                <th className="p-4 pl-6">Equipment Name</th>
                <th className="p-4">Classification</th>
                <th className="p-4">Type</th>
                <th className="p-4">Condition</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Available / Total</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <p className="font-medium">Loading inventory...</p>
                    </div>
                  </td>
                </tr>
              ) : items.map((item) => (
                <tr key={item.item_id} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{item.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground font-mono">ID: {item.item_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-muted-foreground uppercase tracking-tight">{item.classification}</td>
                  <td className="p-4 text-sm font-medium text-muted-foreground uppercase tracking-tight">{item.item_type}</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      item.condition?.toLowerCase() === 'good' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                      item.condition?.toLowerCase() === 'damaged' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                      'bg-rose-500/10 border-rose-500/20 text-rose-500'
                    }`}>
                      {item.condition}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      item.status_condition?.toUpperCase() === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-500' :
                      item.status_condition?.toUpperCase() === 'LOW_STOCK' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-rose-500/10 text-rose-500'
                    }`}>
                      {item.status_condition}
                    </span>
                  </td>
                  <td className="p-4 text-right font-medium">
                    <span className="text-foreground">{item.available_qty}</span>
                    <span className="text-muted-foreground"> / {item.total_qty}</span>
                  </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setItemHistoryItemId(item.item_id)} title="View History" className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-indigo-400 transition-colors">
                          <HistoryIcon className="w-4 h-4" />
                        </button>
                        {item.is_trackable && (
                          <button onClick={() => setUnitManagementItemId(item.item_id)} title="Manage Units" className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-indigo-400 transition-colors">
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        {!item.is_trackable && (
                          <button onClick={() => setBatchManagementItemId(item.item_id)} title="Manage Batches" className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-indigo-400 transition-colors">
                            <Layers className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => openEditModal(item)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-indigo-400 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.item_id)} className="p-2 hover:bg-rose-500/10 rounded-lg text-muted-foreground hover:text-rose-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground font-medium">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    No items found in inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && (
          <Pagination
            meta={meta}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h2 className="text-xl font-bold font-heading">{editingItem ? 'Edit Equipment' : 'Add New Equipment'}</h2>
              <button onClick={resetForm} className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Equipment Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium transition-all"
                  placeholder="e.g. Dell Latitude Laptop"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Classification</label>
                  <select
                    value={formData.classification}
                    onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium transition-all cursor-pointer"
                  >
                    <option value="">Select Classification</option>
                    {classifications.map((c) => (
                      <option key={c.key} value={c.key}>{c.key.charAt(0).toUpperCase() + c.key.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Item Type</label>
                  <select
                    value={formData.item_type}
                    onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium transition-all cursor-pointer"
                  >
                    <option value="">Select Type</option>
                    {itemTypes.map((t) => (
                      <option key={t.key} value={t.key}>{t.key.charAt(0).toUpperCase() + t.key.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium transition-all cursor-pointer"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.key} value={c.key}>{c.value}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium transition-all cursor-pointer"
                  >
                    <option value="">Select Condition</option>
                    {conditions.map((c) => (
                      <option key={c.key} value={c.key}>{c.key.charAt(0).toUpperCase() + c.key.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Trackable Item</label>
                <label className="inline-flex items-center gap-3 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={formData.is_trackable}
                    onChange={(e) => setFormData({ ...formData, is_trackable: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  Enable per-unit tracking for this item
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full h-24 p-4 rounded-xl bg-input/30 border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium transition-all resize-none"
                  placeholder="Additional information about this item..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/25">
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {unitManagementItemId && (
        <UnitManagement 
          itemId={unitManagementItemId} 
          onClose={() => setUnitManagementItemId(null)} 
        />
      )}

      {batchManagementItemId && (
        <BatchManagement 
          itemId={batchManagementItemId} 
          onClose={() => setBatchManagementItemId(null)} 
        />
      )}

      {itemHistoryItemId && (
        <ItemHistory 
          itemId={itemHistoryItemId} 
          onClose={() => setItemHistoryItemId(null)} 
        />
      )}
    </div>
  );
}
