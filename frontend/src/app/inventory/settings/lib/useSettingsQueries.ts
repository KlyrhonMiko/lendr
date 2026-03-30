import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventorySettingsApi, SettingsListParams, SystemSettingCreate } from '../api';

export function useInventorySettings(params: SettingsListParams, activeTab: string) {
  return useQuery({
    queryKey: ['inventory', 'settings', 'dictionary', params],
    queryFn: async () => await inventorySettingsApi.listInventory(params),
    enabled: activeTab === 'dictionary',
  });
}

export function useSettingMutations() {
  const queryClient = useQueryClient();

  const invalidateConfigs = () => {
    // This is the CRITICAL part: it invalidates ALL inventory dropdown configs
    queryClient.invalidateQueries({ queryKey: ['inventory', 'configs'] });
    queryClient.invalidateQueries({ queryKey: ['inventory', 'settings', 'dictionary'] });
  };

  const createSetting = useMutation({
    mutationFn: (data: SystemSettingCreate) => inventorySettingsApi.createInventory(data),
    onSuccess: invalidateConfigs,
  });

  const deleteSetting = useMutation({
    mutationFn: ({ category, key }: { category: string; key: string }) => 
      inventorySettingsApi.deleteInventory(category, key),
    onSuccess: invalidateConfigs,
  });

  return {
    createSetting,
    deleteSetting,
  };
}
