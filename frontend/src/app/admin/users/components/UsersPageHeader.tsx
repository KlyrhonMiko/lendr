'use client';

import { UserPlus } from 'lucide-react';

export function UsersPageHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold font-heading mb-2">User Management</h1>
        <p className="text-muted-foreground text-lg">Manage system users, roles, and shift assignments.</p>
      </div>

      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
      >
        <UserPlus className="w-5 h-5" />
        Add New User
      </button>
    </div>
  );
}

