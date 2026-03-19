'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  UserPlus, 
  Edit2, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle, 
  User as UserIcon,
  Shield,
  Clock,
  Mail
} from 'lucide-react';
import { userApi, User, UserListParams, AuthConfig } from './api';
import { Pagination } from '@/components/ui/Pagination';
import type { PaginationMeta } from '@/lib/api';
import { UserModal } from './UserModal';
import { toast } from 'sonner';

const DEFAULT_PER_PAGE = 10;

export default function UsersPage() {
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
  const [isConfirmingAction, setIsConfirmingAction] = useState<{
    type: 'delete' | 'restore';
    user: User;
  } | null>(null);

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

  const handleAction = async () => {
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

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-heading mb-2">User Management</h1>
          <p className="text-muted-foreground text-lg">Manage system users, roles, and shift assignments.</p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          Add New User
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-2xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border bg-background/50 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID, name, email or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-2xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-medium"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-12 pl-11 pr-10 rounded-2xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-xs font-bold appearance-none min-w-[160px]"
              >
                <option value="">All Roles</option>
                {roles.map(r => (
                  <option key={r.key} value={r.key}>{r.value}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select 
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="h-12 pl-11 pr-10 rounded-2xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-xs font-bold appearance-none min-w-[160px]"
              >
                <option value="">All Shifts</option>
                {shifts.map(s => (
                  <option key={s.key} value={s.key}>{s.value}</option>
                ))}
              </select>
            </div>

            <div className="flex bg-input/30 p-1 rounded-2xl border border-border">
              {(['all', 'active', 'inactive'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-1.5 text-[10px] font-bold rounded-xl transition-all uppercase tracking-wider ${
                    statusFilter === s
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-[10px] uppercase tracking-[0.2em] text-muted-foreground bg-background/30 font-bold">
                <th className="p-6 pl-8">User Info</th>
                <th className="p-6">Employee & ID</th>
                <th className="p-6">Role</th>
                <th className="p-6">Shift</th>
                <th className="p-6">Status</th>
                <th className="p-6 pr-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                      <p className="font-semibold text-lg">Synchronizing user directory...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-muted-foreground">
                    <UserIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="font-bold text-xl mb-1">No users found</p>
                    <p className="text-sm">Try adjusting your filters or search terms.</p>
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.user_id} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-6 pl-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${
                        !user.is_deleted ? 'bg-indigo-500/10 text-indigo-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {user.first_name[0]}{user.last_name[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-base tracking-tight leading-none mb-1">
                          {user.first_name} {user.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          <UserIcon className="w-3 h-3 opacity-50" />
                          @{user.username} · <Mail className="w-3 h-3 opacity-50 ml-1" /> {user.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[11px] text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded w-fit">
                        {user.user_id}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        {user.employee_id || 'No Employee ID'}
                      </span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-xs font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
                       <Shield className="w-3.5 h-3.5 text-indigo-400" />
                       {roles.find(r => r.key === user.role)?.value || user.role}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight flex items-center gap-2">
                       <Clock className="w-3.5 h-3.5 opacity-50" />
                       {shifts.find(s => s.key === user.shift_type)?.value || user.shift_type}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 w-fit border ${
                      !user.is_deleted 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}>
                      {!user.is_deleted ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {!user.is_deleted ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="p-6 pr-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(user)}
                        className="p-2.5 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all border border-transparent hover:border-indigo-500/20"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!user.is_deleted ? (
                        <button 
                          onClick={() => setIsConfirmingAction({ type: 'delete', user })}
                          className="p-2.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                          title="Deactivate User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => setIsConfirmingAction({ type: 'restore', user })}
                          className="p-2.5 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all border border-transparent hover:border-emerald-500/20"
                          title="Restore User"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta && (
          <Pagination
            meta={meta}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        )}
      </div>

      {/* Confirmation Modal */}
      {isConfirmingAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl p-8 animate-in zoom-in-95">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
              isConfirmingAction.type === 'delete' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
            }`}>
              {isConfirmingAction.type === 'delete' ? <Trash2 className="w-8 h-8" /> : <RotateCcw className="w-8 h-8" />}
            </div>
            <h3 className="text-xl font-bold text-center mb-2">
              {isConfirmingAction.type === 'delete' ? 'Deactivate' : 'Restore'} User?
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Are you sure you want to {isConfirmingAction.type === 'delete' ? 'deactivate' : 'restore'} account for {' '}
              <span className="font-bold text-foreground">@{isConfirmingAction.user.username}</span>?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsConfirmingAction(null)}
                className="flex-1 h-12 rounded-2xl border border-border font-bold text-sm hover:bg-muted/50 transition-all uppercase"
              >
                No, cancel
              </button>
              <button 
                onClick={handleAction}
                className={`flex-1 h-12 rounded-2xl text-white font-bold text-sm shadow-lg transition-all uppercase ${
                  isConfirmingAction.type === 'delete' 
                    ? 'bg-rose-500 shadow-rose-500/20 hover:bg-rose-600' 
                    : 'bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600'
                }`}
              >
                Yes, proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <UserModal 
          user={selectedUser}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}
