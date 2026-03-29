'use client';

import { SettingsHeader } from './components/SettingsHeader';
import { SettingsTabs } from './components/SettingsTabs';
import { ErrorBanner } from './components/ErrorBanner';
import { EditSettingModal } from './components/EditSettingModal';
import { RestoreSettingModal } from './components/RestoreSettingModal';
import { useAdminSettingsManagement } from './lib/useAdminSettingsManagement';

// New Section Components
import { GeneralSettings } from './components/GeneralSettings';
import { BrandingSettings } from './components/BrandingSettings';
import { OperationsSettings } from './components/OperationsSettings';
import { HealthSettings } from './components/HealthSettings';
import { SecuritySettings } from './components/SecuritySettings';
import { DictionarySettings } from './components/DictionarySettings';

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
    systems,
    formData,
    setFormData,
    restoreData,
    setRestoreData,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    systemFilter,
    setSystemFilter,
    page,
    setPage,
    perPage,
    setPerPage,
    resetForm,
    openEditModal,
    handleSave,
    handleDelete,
    handleRestore,
    openRestoreModal,
    closeRestoreModal,
    openEditModalForNew,
  } = useAdminSettingsManagement();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <SettingsHeader />

      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {error && <ErrorBanner error={error} />}

      <div className="min-h-[600px]">
        {activeTab === 'general' && <GeneralSettings />}

        {activeTab === 'system' && <BrandingSettings />}
        
        {activeTab === 'operations' && <OperationsSettings />}
        
        {activeTab === 'health' && <HealthSettings />}
        
        {activeTab === 'security' && <SecuritySettings />}
        
        {activeTab === 'dictionary' && (
          <DictionarySettings 
            settings={settings}
            loading={loading}
            meta={meta}
            categories={categories}
            systems={systems}
            search={search}
            onSearchChange={setSearch}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            systemFilter={systemFilter}
            onSystemFilterChange={setSystemFilter}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onOpenRestore={openRestoreModal}
            onOpenNew={openEditModalForNew}
          />
        )}
      </div>

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
