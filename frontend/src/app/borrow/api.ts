import { api, buildQueryString } from '@/lib/api';

export interface BorrowCatalogItem {
  item_id: string;
  name: string;
  category: string;
  total_qty: number;
  available_qty: number;
  condition: string;
  item_type?: string;
  classification?: string;
  description?: string;
  status_condition?: string;
}

interface BorrowCatalogParams {
  page?: number;
  per_page?: number;
  search?: string;
  category?: string;
  item_type?: string;
  classification?: string;
  in_stock_only?: boolean;
}

interface CreateBatchBorrowPayload {
  items: {
    item_id: string;
    qty_requested: number;
  }[];
  notes: string;
  customer_name: string;
  location_name: string;
}

export const posApi = {
  listCatalog: (params: BorrowCatalogParams = {}) =>
    api.get<BorrowCatalogItem[]>(
      `/inventory/borrower/catalog${buildQueryString(params as Record<string, unknown>)}`
    ),

  // Submit multi-item borrow request through public borrower flow
  createBatchBorrow: (data: CreateBatchBorrowPayload) =>
    api.post('/inventory/borrower/requests', data),
};

