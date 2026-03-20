'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { PaginationMeta } from '@/lib/api';
import type { AuthConfig, User, UserListParams } from '../api';
import { userApi } from '../api';
import type { UserConfirmAction } from './types';

const DEFAULT_PER_PAGE = 10;

export function useUsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  // Config states
  const [roles, setRoles] = useState<AuthConfig[]>([]);
  const [shifts, setShifts] = useState<AuthConfig[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [isConfirmingAction, setIsConfirmingAction] = useState<UserConfirmAction | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: UserListParams = {
        page,
        per_page: perPage,
        search: search || undefined,
        role: roleFilter || undefined,
        shift_type: shiftFilter || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
      };

      const res = await userApi.list(params);
      setUsers(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, roleFilter, shiftFilter, statusFilter]);

  const fetchConfigs = useCallback(async () => {
    try {
      const [rolesRes, shiftsRes] = await Promise.all([
        userApi.getConfigs('users_role'),
        userApi.getConfigs('users_shift_type'),
      ]);
      setRoles(rolesRes.data);
      setShifts(shiftsRes.data);
    } catch (err) {
      // Configs are used for friendly labels; failure shouldn't hard-break the page.
      console.error('Failed to fetch configs:', err);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

    try {
      if (type === 'delete') {
        await userApi.delete(user.user_id);
        toast.success(`User ${user.username} deactivated`);
      } else {
        await userApi.restore(user.user_id);
        toast.success(`User ${user.username} restored`);
      }

      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${type} user`);
    } finally {
      setIsConfirmingAction(null);
    }
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
    // Refetch
    fetchUsers,
  };
}

