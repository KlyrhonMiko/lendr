'use client';

import { Plus, Users } from 'lucide-react';

export function UsersPageHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-primary/10 items-center justify-center shrink-0">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage system users, roles, and shift assignments.
          </p>
        </div>
      </div>

      <button
        onClick={onAdd}
        className="flex items-center gap-2.5 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold shadow-sm transition-colors active:scale-[0.98]"
      >
        <Plus className="w-5 h-5" strokeWidth={2.5} />
        Add New User
      </button>
    </div>
  );
}
