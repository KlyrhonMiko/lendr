import type { InventoryItemFormData } from './inventoryItemForm';

interface InventoryValidationOptions {
  categories?: string[];
  itemTypes?: string[];
  conditions?: string[];
}

function includesOrEmpty(options: string[] | undefined, value: string): boolean {
  if (!options || options.length === 0) return true;
  return options.includes(value);
}

export function validateInventoryItemForm(
  formData: InventoryItemFormData,
  options: InventoryValidationOptions = {},
): string | null {
  const name = formData.name.trim();
  const category = formData.category.trim();
  const itemType = formData.item_type.trim();
  const condition = formData.condition.trim();
  const description = formData.description.trim();

  if (!name) return 'Equipment name is required';
  if (name.length < 2) return 'Equipment name must be at least 2 characters';

  if (!category) return 'Category is required';
  if (!includesOrEmpty(options.categories, category)) return 'Please select a valid category';

  if (!itemType) return 'Item type is required';
  if (!includesOrEmpty(options.itemTypes, itemType)) return 'Please select a valid item type';

  if (!condition) return 'Condition is required';
  if (!includesOrEmpty(options.conditions, condition)) return 'Please select a valid condition';

  if (description.length > 1000) return 'Description must not exceed 1000 characters';

  return null;
}
