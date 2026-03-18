import { api, buildQueryString } from '@/lib/api';

export interface InventoryItem {
  item_id: string;
  name: string;
  category: string;
  total_qty: number;
  available_qty: number;
  condition: string;
  status_condition?: string;
  item_type?: string;
  classification?: string;
  is_trackable?: boolean;
  description?: string;
}

export interface InventoryItemCreate {
  name: string;
  category?: string;
  item_type?: string;
  classification?: string;
  is_trackable?: boolean;
  description?: string;
}

export interface InventoryItemUpdate extends Partial<InventoryItemCreate> {
  condition?: string;
}

export interface InventoryListParams {
  page?: number;
  per_page?: number;
  search?: string;
  category?: string;
  item_type?: string;
  classification?: string;
  is_trackable?: boolean;
  condition?: string;
  include_deleted?: boolean;
}

export interface ConfigRead {
  key: string;
  value: string;
  category: string;
  description?: string;
}

export interface InventoryBatch {
  batch_id: string;
  inventory_uuid: string;
  total_qty: number;
  available_qty: number;
  expiration_date: string | null;
  status: string;
  received_at: string;
  description?: string;
}

export interface InventoryBatchCreate {
  expiration_date?: string;
  status?: string;
  description?: string;
}

export interface InventoryBatchUpdate {
  expiration_date?: string;
  status?: string;
  description?: string;
}

export interface StockAdjustmentPayload {
  qty_change: number;
  movement_type: string;
  reason_code?: string;
  reference_id?: string;
  batch_id?: string;
  note: string;
}

export const inventoryApi = {
  getConfigs: (category: string) =>
    api.get<ConfigRead[]>(`/inventory/config/inventory?category=${category}&per_page=100`),

  list: (params: InventoryListParams = {}) =>
    api.get<InventoryItem[]>(`/inventory/items${buildQueryString(params as Record<string, unknown>)}`),

  get: (id: string) => api.get<InventoryItem>(`/inventory/items/${id}`),

  create: (data: InventoryItemCreate) => api.post<InventoryItem>('/inventory/items', data),

  update: (id: string, data: InventoryItemUpdate) =>
    api.patch<InventoryItem>(`/inventory/items/${id}`, data),

  delete: (id: string) => api.delete<InventoryItem>(`/inventory/items/${id}`),

  restore: (id: string) => api.post<InventoryItem>(`/inventory/items/${id}/restore`, {}),

  // Units
  listUnits: (itemId: string, params: { page?: number; per_page?: number; status?: string; search?: string } = {}) =>
    api.get<any[]>(`/inventory/items/${itemId}/units${buildQueryString(params as Record<string, unknown>)}`),

  createUnit: (itemId: string, data: { serial_number: string; internal_ref?: string; expiration_date?: string; condition?: string; description?: string }) =>
    api.post<any>(`/inventory/items/${itemId}/units`, data),

  createUnitsBatch: (itemId: string, units: Array<{ serial_number: string; internal_ref?: string; expiration_date?: string; condition?: string; description?: string }>) =>
    api.post<any[]>(`/inventory/items/${itemId}/units/batch`, { units }),

  updateUnit: (itemId: string, unitId: string, data: { status?: string; condition?: string; expiration_date?: string; description?: string }) =>
    api.patch<any>(`/inventory/items/${itemId}/units/${unitId}`, data),

  retireUnit: (itemId: string, unitId: string) =>
    api.delete<any>(`/inventory/items/${itemId}/units/${unitId}`),

  // Batches
  listBatches: (itemId: string, params: { page?: number; per_page?: number; status?: string; include_expired?: boolean } = {}) =>
    api.get<InventoryBatch[]>(`/inventory/items/${itemId}/batches${buildQueryString(params as Record<string, unknown>)}`),

  createBatch: (itemId: string, data: InventoryBatchCreate) =>
    api.post<InventoryBatch>(`/inventory/items/${itemId}/batches`, data),

  updateBatch: (itemId: string, batchId: string, data: InventoryBatchUpdate) =>
    api.patch<InventoryBatch>(`/inventory/items/${itemId}/batches/${batchId}`, data),

  adjustStock: (itemId: string, data: StockAdjustmentPayload) =>
    api.post<InventoryItem>(`/inventory/items/${itemId}/adjust-stock`, data),

  // Movements
  getHistory: (itemId: string, params: { page?: number; per_page?: number; movement_type?: string } = {}) =>
    api.get<any[]>(`/inventory/items/${itemId}/movement-history${buildQueryString(params as Record<string, unknown>)}`),

  getSummary: (itemId: string) =>
    api.get<any>(`/inventory/items/${itemId}/movements/summary`),

  reconcile: (itemId: string) =>
    api.post<any>(`/inventory/items/${itemId}/movements/reconcile`, {}),
};
