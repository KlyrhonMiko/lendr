import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, UserListParams, UserCreate, UserUpdate } from '../api';
import { toast } from 'sonner';

const STALE_TIME_CONFIG = Infinity;
const STALE_TIME_LIST = 1000 * 60; // 1 minute

export function useAdminUsers(params: UserListParams) {
  return useQuery({
    queryKey: ['admin', 'users', 'list', params],
    queryFn: () => userApi.list(params),
    staleTime: STALE_TIME_LIST,
  });
}

export function useAdminUserConfigs(category: 'users_role' | 'users_shift_type') {
  return useQuery({
    queryKey: ['admin', 'users', 'config', category],
    queryFn: () => userApi.getConfigs(category),
    staleTime: STALE_TIME_CONFIG,
  });
}

export function useAdminUserMutations() {
  const queryClient = useQueryClient();

  const invalidateUsers = () => {
    return queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const registerUser = useMutation({
    mutationFn: (data: UserCreate) => userApi.register(data),
    onSuccess: async () => {
      await invalidateUsers();
      toast.success('User registered successfully');
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdate }) =>
      userApi.update(userId, data),
    onSuccess: async () => {
      await invalidateUsers();
      toast.success('User updated successfully');
    },
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => userApi.delete(userId),
    onSuccess: async () => {
      await invalidateUsers();
      toast.success('User deactivated');
    },
  });

  const restoreUser = useMutation({
    mutationFn: (userId: string) => userApi.restore(userId),
    onSuccess: async () => {
      await invalidateUsers();
      toast.success('User restored');
    },
  });

  return {
    registerUser,
    updateUser,
    deleteUser,
    restoreUser,
  };
}
