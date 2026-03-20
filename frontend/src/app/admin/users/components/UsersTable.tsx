'use client';

import {
  User as UserIcon,
  Mail,
  Edit2,
  Trash2,
  RotateCcw,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { AuthConfig, User } from '../api';
import type { UserConfirmAction } from '../lib/types';

export function UsersTable({
  users,
  roles,
  shifts,
  loading,
  onEdit,
  onRequestAction,
}: {
  users: User[];
  roles: AuthConfig[];
  shifts: AuthConfig[];
  loading: boolean;
  onEdit: (user: User) => void;
  onRequestAction: (action: UserConfirmAction) => void;
}) {
  return (
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
          ) : (
            users.map((user) => (
              <tr key={user.user_id} className="hover:bg-muted/30 transition-colors group">
                <td className="p-6 pl-8">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${
                        !user.is_deleted ? 'bg-indigo-500/10 text-indigo-500' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {user.first_name[0]}
                      {user.last_name[0]}
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
                    {roles.find((r) => r.key === user.role)?.value || user.role}
                  </span>
                </td>

                <td className="p-6">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 opacity-50" />
                    {shifts.find((s) => s.key === user.shift_type)?.value || user.shift_type}
                  </span>
                </td>

                <td className="p-6">
                  <span
                    className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5 w-fit border ${
                      !user.is_deleted
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}
                  >
                    {!user.is_deleted ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {!user.is_deleted ? 'Active' : 'Deactivated'}
                  </span>
                </td>

                <td className="p-6 pr-8 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(user)}
                      className="p-2.5 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all border border-transparent hover:border-indigo-500/20"
                      title="Edit User"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {!user.is_deleted ? (
                      <button
                        onClick={() => onRequestAction({ type: 'delete', user })}
                        className="p-2.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                        title="Deactivate User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onRequestAction({ type: 'restore', user })}
                        className="p-2.5 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all border border-transparent hover:border-emerald-500/20"
                        title="Restore User"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

