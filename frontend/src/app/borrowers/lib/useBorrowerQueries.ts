import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  borrowersApi,
  BorrowerAccountUpdatePayload,
  BorrowerHistoryParams,
} from '../api';

const STALE_TIME = 30 * 1000;

export const borrowerKeys = {
  history: (params: BorrowerHistoryParams) => ['borrowers', 'history', params] as const,
};

export function useBorrowerHistory(params: BorrowerHistoryParams) {
  return useQuery({
    queryKey: borrowerKeys.history(params),
    queryFn: async () => await borrowersApi.getHistory(params),
    staleTime: STALE_TIME,
  });
}

export function useBorrowerAccountUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BorrowerAccountUpdatePayload) => await borrowersApi.updateAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowers', 'history'] });
    },
  });
}
