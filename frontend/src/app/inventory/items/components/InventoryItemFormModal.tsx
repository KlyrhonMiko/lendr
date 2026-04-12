'use client';

import { useState } from 'react';
import type { InventoryItem, ConfigRead } from '../api';
import type { InventoryItemFormData } from '../lib/inventoryItemForm';
import { ChevronDown, Package, X, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { FormSelect } from '@/components/ui/form-select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export function InventoryItemFormModal({
  editingItem,
  formData,
  classifications,
  itemTypes,
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
  categories: ConfigRead[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  setFormData: React.Dispatch<React.SetStateAction<InventoryItemFormData>>;
  resetForm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={() => { resetForm(); onClose(); }}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Package className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold font-heading">{editingItem ? 'Edit Equipment' : 'Add New Equipment'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingItem ? 'Update the details for this equipment' : 'Fill in the details to add equipment to your catalog'}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            aria-label="Close equipment form"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Equipment Name <span className="text-rose-500">*</span>
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-11 px-3.5 rounded-xl bg-muted/50 border border-border text-sm font-medium focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all font-heading"
              placeholder="e.g. Dell Latitude Laptop"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Category"
              value={formData.category}
              onChange={(v) => setFormData({ ...formData, category: v })}
              options={[{ key: '', label: 'Select category' }, ...categories.map((c) => ({ key: c.key, label: c.value }))]}
              placeholder="Select category"
            />
            <FormSelect
              label="Classification"
              value={formData.classification}
              onChange={(v) => setFormData({ ...formData, classification: v })}
              options={[
                { key: '', label: 'Select classification' },
                ...classifications.map((c) => ({ key: c.key, label: c.key.charAt(0).toUpperCase() + c.key.slice(1) })),
              ]}
              placeholder="Select classification"
            />
          </div>

          <FormSelect
            label="Item Type"
            value={formData.item_type}
            onChange={(v) => setFormData({ ...formData, item_type: v })}
            options={[
              { key: '', label: 'Select type' },
              ...itemTypes.map((t) => ({ key: t.key, label: t.key.charAt(0).toUpperCase() + t.key.slice(1) })),
            ]}
            placeholder="Select type"
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full h-20 p-3.5 rounded-xl bg-muted/50 border border-border text-sm font-medium focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none"
              placeholder="Optional notes about this equipment..."
            />
          </div>

          {!editingItem && (
            <label className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50 cursor-pointer hover:bg-muted/60 transition-colors">
              <Checkbox
                checked={formData.is_trackable}
                onCheckedChange={(checked: boolean | "indeterminate") => setFormData({ ...formData, is_trackable: checked === true })}
              />
              <div>
                <p className="text-sm font-medium text-foreground font-heading leading-none">Track individual units</p>
                <p className="text-xs text-muted-foreground mt-1">Enable serial number or per-unit tracking</p>
              </div>
            </label>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="flex-1 h-11 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/20"
            >
              {editingItem ? 'Save Changes' : 'Add Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
