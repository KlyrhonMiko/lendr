'use client';

import { SettingsToolbar } from './SettingsToolbar';
import { SettingsTable } from './SettingsTable';
import { Pagination } from '@/components/ui/Pagination';
import type { SystemSetting } from '../api';
import type { PaginationMeta } from '@/lib/api';

interface DictionarySettingsProps {
  settings: SystemSetting[];
  loading: boolean;
  meta: PaginationMeta | null;
  categories: string[];
  search: string;
  onSearchChange: (val: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (val: string) => void;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onEdit: (setting: SystemSetting) => void;
  onDelete: (key: string, category: string) => void;
}

export function DictionarySettings({
  settings,
  loading,
  meta,
  categories,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  onPageChange,
  onPerPageChange,
  onEdit,
  onDelete
}: DictionarySettingsProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SettingsToolbar
        search={search}
        onSearchChange={onSearchChange}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={onCategoryFilterChange}
        meta={meta}
        categories={categories}
      />

      <SettingsTable
        settings={settings}
        loading={loading}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {meta && (
        <Pagination 
          meta={meta} 
          onPageChange={onPageChange} 
          onPerPageChange={onPerPageChange} 
        />
      )}
    </div>
  );
}
