'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { inventoryApi, InventoryItem, InventoryListParams, ConfigRead } from './api';
import { UnitManagement } from './UnitManagement';
import { BatchManagement } from './BatchManagement';
import { ItemHistory } from './ItemHistory';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/lib/api';
import { toast } from 'sonner';
import { useDebounce } from './lib/useDebounce';
import type { InventoryItemFormData } from './lib/inventoryItemForm';
import { InventoryItemsHeader } from './components/InventoryItemsHeader';
import { InventoryItemsToolbar } from './components/InventoryItemsToolbar';
import { InventoryItemsTable } from './components/InventoryItemsTable';
import { InventoryItemFormModal } from './components/InventoryItemFormModal';

const DEFAULT_PER_PAGE = 10;

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
  const [formData, setFormData] = useState<InventoryItemFormData>({
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
      <InventoryItemsHeader onAdd={() => setIsModalOpen(true)} />

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <InventoryItemsToolbar
          search={search}
          onSearchChange={setSearch}
          showFilters={showFilters}
          onShowFiltersChange={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          categories={categories}
          meta={meta}
          classificationFilter={classificationFilter}
          onClassificationFilterChange={setClassificationFilter}
          itemTypeFilter={itemTypeFilter}
          onItemTypeFilterChange={setItemTypeFilter}
          conditionFilter={conditionFilter}
          onConditionFilterChange={setConditionFilter}
          classifications={classifications}
          itemTypes={itemTypes}
          conditions={conditions}
          onClearExpandedFilters={() => {
            setClassificationFilter('');
            setItemTypeFilter('');
            setConditionFilter('');
          }}
        />

        <InventoryItemsTable
          items={items}
          loading={loading}
          onOpenHistory={(itemId) => setItemHistoryItemId(itemId)}
          onOpenUnitManagement={(itemId) => setUnitManagementItemId(itemId)}
          onOpenBatchManagement={(itemId) => setBatchManagementItemId(itemId)}
          onOpenEdit={openEditModal}
          onDelete={handleDelete}
        />

        {/* Pagination */}
        {meta && (
          <Pagination
            meta={meta}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        )}
      </div>

      {isModalOpen && (
        <InventoryItemFormModal
          editingItem={editingItem}
          formData={formData}
          classifications={classifications}
          itemTypes={itemTypes}
          conditions={conditions}
          categories={categories}
          setFormData={setFormData}
          onClose={() => {}}
          onSubmit={handleSave}
          resetForm={resetForm}
        />
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
