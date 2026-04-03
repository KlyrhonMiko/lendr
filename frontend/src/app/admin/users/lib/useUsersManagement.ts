'use client';

import { useEffect, useState } from 'react';
import type { User, UserListParams } from '../api';
import type { UserConfirmAction } from './types';
import { useAdminUsers, useAdminUserConfigs, useAdminUserMutations } from './useUserQueries';

const DEFAULT_PER_PAGE = 10;

export function useUsersManagement() {
  // Filter states
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  // Params
  const params: UserListParams = {
    page,
    per_page: perPage,
    search: search || undefined,
    role: roleFilter || undefined,
    shift_type: shiftFilter || undefined,
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
  };

  // Queries
  const { data: usersRes, isLoading: loading, error: userError } = useAdminUsers(params);
  const { data: rolesRes } = useAdminUserConfigs('users_role');
  const { data: shiftsRes } = useAdminUserConfigs('users_shift_type');

  // Mutations
  const { deleteUser, restoreUser } = useAdminUserMutations();

  const users = usersRes?.data || [];
  const meta = usersRes?.meta || null;
  const error = userError?.message || null;
  const roles = rolesRes?.data || [];
  const shifts = shiftsRes?.data || [];

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [isConfirmingAction, setIsConfirmingAction] = useState<UserConfirmAction | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, shiftFilter, statusFilter, perPage]);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedUser(undefined);
    setIsModalOpen(true);
  };

  const closeUserModal = () => setIsModalOpen(false);

  const handleConfirmAction = async () => {
    if (!isConfirmingAction) return;
    const { type, user } = isConfirmingAction;

    const action = type === 'delete' ? deleteUser : restoreUser;

    action.mutate(user.user_id, {
      onSettled: () => setIsConfirmingAction(null),
    });
  };

  return {
    // Data
    users,
    meta,
    loading,
    error,
    roles,
    shifts,
    // Filters / pagination
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    shiftFilter,
    setShiftFilter,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    perPage,
    setPerPage,
    // Modals
    isModalOpen,
    selectedUser,
    closeUserModal,
    setIsModalOpen,
    isConfirmingAction,
    setIsConfirmingAction,
    // Handlers
    handleEdit,
    handleAdd,
    handleConfirmAction,
    // Refetch (proxy to trigger refresh if needed)
    fetchUsers: () => {}, 
  };
}
