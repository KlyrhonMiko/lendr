'use client';

import type { InventoryItem, ConfigRead } from '../api';
import type { InventoryItemFormData } from '../lib/inventoryItemForm';
import { X } from 'lucide-react';
import type React from 'react';

export function InventoryItemFormModal({
  editingItem,
  formData,
  classifications,
  itemTypes,
  conditions,
  categories,
  onClose,
  onSubmit,
  setFormData,
  resetForm,
}: {
  editingItem: InventoryItem | null;
  formData: InventoryItemFormData;
  classifications: ConfigRead[];
  itemTypes: ConfigRead[];
  conditions: ConfigRead[];
  categories: ConfigRead[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  setFormData: React.Dispatch<React.SetStateAction<InventoryItemFormData>>;
  resetForm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="text-xl font-bold font-heading">{editingItem ? 'Edit Equipment' : 'Add New Equipment'}</h2>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
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
                  <option key={c.key} value={c.key}>
                    {c.key.charAt(0).toUpperCase() + c.key.slice(1)}
                  </option>
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
                  <option key={t.key} value={t.key}>
                    {t.key.charAt(0).toUpperCase() + t.key.slice(1)}
                  </option>
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
                  <option key={c.key} value={c.key}>
                    {c.value}
                  </option>
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
                  <option key={c.key} value={c.key}>
                    {c.key.charAt(0).toUpperCase() + c.key.slice(1)}
                  </option>
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
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="flex-1 py-3 rounded-xl font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/25"
            >
              {editingItem ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

