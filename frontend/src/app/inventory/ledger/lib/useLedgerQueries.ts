import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ledgerApi, MovementLedgerParams } from '../api';
import { inventorySettingsApi } from '../../settings/api';

const STALE_TIME = 1000 * 60; // 1 minute

export function useLedgerMovements(params: MovementLedgerParams, enabled: boolean) {
  return useQuery({
    queryKey: ['inventory', 'ledger', 'movements', params],
    queryFn: async () => await ledgerApi.list(params),
    staleTime: STALE_TIME,
    enabled,
    placeholderData: (previousData) => previousData, // keep previous data on pagination
  });
}

export function useLedgerAnomalies(enabled: boolean) {
  return useQuery({
    queryKey: ['inventory', 'ledger', 'anomalies'],
    queryFn: async () => await ledgerApi.getAnomalies(),
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useReasonCodes() {
  return useQuery({
    queryKey: ['inventory', 'configs', 'reason_codes'],
    queryFn: async () => {
      try {
        const res = await inventorySettingsApi.listInventory({ category: 'inventory_movements_reason_code' });
        return res.data.length > 0 ? res.data.map((s) => s.key) : ['CORRECTION', 'ERROR', 'DUPLICATE_ENTRY', 'DAMAGED_ON_ARRIVAL'];
      } catch {
        return ['CORRECTION', 'ERROR', 'DUPLICATE_ENTRY', 'DAMAGED_ON_ARRIVAL'];
      }
    },
    staleTime: Infinity,
  });
}

export function useLedgerMutations() {
  const queryClient = useQueryClient();

  const reverseMovement = useMutation({
    mutationFn: ({ id, reason, reasonCode }: { id: string; reason: string; reasonCode: string }) =>
      ledgerApi.reverse(id, reason, reasonCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'ledger'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
    },
  });

  return { reverseMovement };
}
