'use client';

import { Pagination } from '@/components/ui/Pagination';
import { SettingsHeader } from './components/SettingsHeader';
import { SettingsTabs } from './components/SettingsTabs';
import { ErrorBanner } from './components/ErrorBanner';
import { SettingsToolbar } from './components/SettingsToolbar';
import { SettingsTable } from './components/SettingsTable';
import { LookupExplorer } from './components/LookupExplorer';
import { EditSettingModal } from './components/EditSettingModal';
import { RestoreSettingModal } from './components/RestoreSettingModal';
import { useAdminSettingsManagement } from './lib/useAdminSettingsManagement';

export default function SettingsPage() {
  const {
    settings,
    meta,
    loading,
    error,
    activeTab,
    setActiveTab,
    isModalOpen,
    editingKey,
    isRestoreModalOpen,
    categories,
    tables,
    selectedTable,
    columns,
    formData,
    setFormData,
    restoreData,
    setRestoreData,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    page,
    setPage,
    perPage,
    setPerPage,
    resetForm,
    openEditModal,
    handleSave,
    handleDelete,
    handleRestore,
    fetchColumns,
    openRestoreModal,
    closeRestoreModal,
    openEditModalForNew,
  } = useAdminSettingsManagement();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <SettingsHeader onOpenRestore={openRestoreModal} onOpenNew={openEditModalForNew} />

      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {error && <ErrorBanner error={error} />}

      {activeTab !== 'lookup' ? (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <SettingsToolbar
            search={search}
            onSearchChange={setSearch}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            meta={meta}
          />

          <SettingsTable
            settings={settings}
            loading={loading}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />

          {meta && <Pagination meta={meta} onPageChange={setPage} onPerPageChange={setPerPage} />}
        </div>
      ) : (
        <LookupExplorer
          loading={loading}
          categories={categories}
          onCategoryClick={setCategoryFilter}
          tables={tables}
          selectedTable={selectedTable}
          onSelectTable={fetchColumns}
          columns={columns}
        />
      )}

      {isModalOpen && (
        <EditSettingModal
          editingKey={editingKey}
          formData={formData}
          setFormData={setFormData}
          onClose={resetForm}
          onSubmit={handleSave}
        />
      )}

      {isRestoreModalOpen && (
        <RestoreSettingModal
          restoreData={restoreData}
          setRestoreData={setRestoreData}
          onCancel={closeRestoreModal}
          onSubmit={handleRestore}
        />
      )}
    </div>
  );
}
