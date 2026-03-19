import type { InventoryItem } from '@/app/inventory/items/api';

export interface CartItem extends InventoryItem {
  cartQty: number;
}

