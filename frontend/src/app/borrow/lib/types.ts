import type { BorrowCatalogItem } from '../api';

export interface CartItem extends BorrowCatalogItem {
  cartQty: number;
}

