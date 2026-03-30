import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, InventoryListParams, InventoryItemCreate, InventoryItemUpdate } from '../api';

const STALE_TIME = 1000 * 60; // 1 minute

export function useInventoryItems(params: InventoryListParams) {
  return useQuery({
    queryKey: ['inventory', 'items', params],
    queryFn: async () => await inventoryApi.list(params),
    staleTime: STALE_TIME,
  });
}

export function useInventoryConfigs() {
  return useQuery({
    queryKey: ['inventory', 'configs', 'item_categories'],
    queryFn: async () => {
      const [classRes, typeRes, condRes, catRes] = await Promise.all([
        inventoryApi.getConfigs('inventory_classification'),
        inventoryApi.getConfigs('inventory_item_type'),
        inventoryApi.getConfigs('inventory_condition'),
        inventoryApi.getConfigs('inventory_category'),
      ]);
      return {
        classifications: classRes.data,
        itemTypes: typeRes.data,
        conditions: condRes.data,
        categories: catRes.data,
      };
    },
    staleTime: Infinity, // Configs rarely change
  });
}

export function useInventoryItemMutations() {
  const queryClient = useQueryClient();

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
  };

  const createItem = useMutation({
    mutationFn: (data: InventoryItemCreate) => inventoryApi.create(data),
    onSuccess: invalidateList,
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InventoryItemUpdate }) => inventoryApi.update(id, data),
    onSuccess: invalidateList,
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => inventoryApi.delete(id),
    onSuccess: invalidateList,
  });

  return {
    createItem,
    updateItem,
    deleteItem,
  };
}

// Units
export function useInventoryUnits(itemId: string, params: any) {
  return useQuery({
    queryKey: ['inventory', 'items', itemId, 'units', params],
    queryFn: async () => await inventoryApi.listUnits(itemId, params),
    staleTime: STALE_TIME,
  });
}

// Batches
export function useInventoryBatches(itemId: string, params: any) {
  return useQuery({
    queryKey: ['inventory', 'items', itemId, 'batches', params],
    queryFn: async () => await inventoryApi.listBatches(itemId, params),
    staleTime: STALE_TIME,
  });
}
