import { api } from '@/lib/api';

export interface InventoryItem {
  item_id: string;
  name: string;
  category: string;
  total_qty: number;
  available_qty: number;
  condition: string;
  status_condition?: string;
}

export interface InventoryItemCreate {
  name: string;
  category: string;
  total_qty: number;
  available_qty: number;
  condition: string;
}

export interface InventoryItemUpdate extends Partial<InventoryItemCreate> {}

export const inventoryApi = {
  list: () => api.get<InventoryItem[]>('/inventory/items'),
  
  get: (id: string) => api.get<InventoryItem>(`/inventory/items/${id}`),
  
  create: (data: InventoryItemCreate) => api.post<InventoryItem>('/inventory/items', data),
  
  update: (id: string, data: InventoryItemUpdate) => 
    api.patch<InventoryItem>(`/inventory/items/${id}`, data),
  
  delete: (id: string) => api.delete<InventoryItem>(`/inventory/items/${id}`),
  
  restore: (id: string) => api.post<InventoryItem>(`/inventory/items/${id}/restore`, {}),
};
