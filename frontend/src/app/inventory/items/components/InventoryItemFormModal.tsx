'use client';

import { useState } from 'react';
import type { InventoryItem, ConfigRead } from '../api';
import type { InventoryItemFormData } from '../lib/inventoryItemForm';
import { ChevronDown, Package, X, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type React from 'react';

function FormPopoverSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
  placeholder: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const displayValue = options.find((o) => o.key === value)?.label ?? placeholder;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className="w-full h-11 px-3.5 rounded-xl bg-muted/50 border border-border text-sm font-medium cursor-pointer flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
        >
          <span className={cn('truncate text-left', !value && 'text-muted-foreground')}>{displayValue}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-1 max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.key || 'empty'}
              type="button"
              onClick={() => {
                onChange(opt.key);
                setOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left',
                value === opt.key ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
              )}
            >
              <Check className={cn('w-4 h-4 shrink-0', value === opt.key ? 'opacity-100' : 'opacity-0')} />
              {opt.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

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
              className="w-full h-11 px-3.5 rounded-xl bg-muted/50 border border-border text-sm font-medium focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              placeholder="e.g. Dell Latitude Laptop"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormPopoverSelect
              label="Category"
              value={formData.category}
              onChange={(v) => setFormData({ ...formData, category: v })}
              options={[{ key: '', label: 'Select category' }, ...categories.map((c) => ({ key: c.key, label: c.value }))]}
              placeholder="Select category"
            />
            <FormPopoverSelect
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

          <div className="grid grid-cols-2 gap-3">
            <FormPopoverSelect
              label="Item Type"
              value={formData.item_type}
              onChange={(v) => setFormData({ ...formData, item_type: v })}
              options={[
                { key: '', label: 'Select type' },
                ...itemTypes.map((t) => ({ key: t.key, label: t.key.charAt(0).toUpperCase() + t.key.slice(1) })),
              ]}
              placeholder="Select type"
            />
            <FormPopoverSelect
              label="Condition"
              value={formData.condition}
              onChange={(v) => setFormData({ ...formData, condition: v })}
              options={[
                { key: '', label: 'Select condition' },
                ...conditions.map((c) => ({ key: c.key, label: c.key.charAt(0).toUpperCase() + c.key.slice(1) })),
              ]}
              placeholder="Select condition"
            />
          </div>

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
              <input
                type="checkbox"
                checked={formData.is_trackable}
                onChange={(e) => setFormData({ ...formData, is_trackable: e.target.checked })}
                className="h-4.5 w-4.5 rounded border-border accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Track individual units</p>
                <p className="text-xs text-muted-foreground mt-0.5">Enable serial number or per-unit tracking</p>
              </div>
            </label>
          )}

          <div className="flex gap-3 pt-2">
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
