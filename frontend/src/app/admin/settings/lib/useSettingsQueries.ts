import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  settingsApi,
  healthApi,
  archivesApi,
  SettingsListParams,
  SystemSettingCreate,
  GeneralSettingsData,
  BrandingSettingsData,
  OperationsSettingsData,
} from '../api';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { BackupRun } from '../../backup/api';

const STALE_TIME_CONFIG = Infinity;
const STALE_TIME_LIST = 1000 * 30; // 30 seconds
const STALE_TIME_HEALTH = 1000 * 15; // 15 seconds

// --- Dictionary & Settings Queries ---

export function useAdminSettings(params: SettingsListParams) {
  return useQuery({
    queryKey: ['admin', 'settings', 'dictionary', params],
    queryFn: () => settingsApi.list(params),
    staleTime: STALE_TIME_LIST,
  });
}

export function useAuthConfigurations(params: SettingsListParams) {
  return useQuery({
    queryKey: ['auth', 'settings', 'configurations', params],
    queryFn: () => settingsApi.listAuth(params),
    staleTime: STALE_TIME_LIST,
  });
}

export function useAdminSettingLookups() {
  return useQuery({
    queryKey: ['admin', 'settings', 'lookups'],
    queryFn: async () => {
      const [catRes, sysRes] = await Promise.all([
        settingsApi.listCategories(),
        settingsApi.listSystems(),
      ]);
      return {
        categories: catRes.data,
        systems: sysRes.data,
      };
    },
    staleTime: STALE_TIME_CONFIG,
  });
}

// --- Health Queries ---

export function useHealthStatus() {
  return useQuery({
    queryKey: ['admin', 'health', 'status'],
    queryFn: () => healthApi.getStatus(),
    staleTime: STALE_TIME_HEALTH,
    refetchInterval: 15000, // Auto refresh every 15s for "live" feel
  });
}

export function useHealthStorage() {
  return useQuery({
    queryKey: ['admin', 'health', 'storage'],
    queryFn: () => healthApi.getStorage(),
    staleTime: 1000 * 60 * 5, // 5 minutes, storage doesn't change fast
  });
}

export function useHealthSessions() {
  return useQuery({
    queryKey: ['admin', 'health', 'sessions'],
    queryFn: () => healthApi.getSessions(),
    staleTime: STALE_TIME_HEALTH,
  });
}

export function useHealthLogs(params: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['admin', 'health', 'logs', params],
    queryFn: () => healthApi.getLogs(params),
    staleTime: STALE_TIME_HEALTH,
  });
}

export function useGeneralSettings() {
  return useQuery({
    queryKey: ['admin', 'settings', 'general'],
    queryFn: () => api.get<GeneralSettingsData>('/admin/settings/general'),
    staleTime: Infinity,
  });
}

export function useBrandingSettings() {
  return useQuery({
    queryKey: ['admin', 'settings', 'branding'],
    queryFn: () => api.get<BrandingSettingsData>('/admin/settings/branding'),
    staleTime: Infinity, // Branding changes very rarely
  });
}

// --- Operations & Backup Queries ---

export function useOperationsSettings() {
  return useQuery({
    queryKey: ['admin', 'settings', 'operations'],
    queryFn: () => api.get<OperationsSettingsData>('/admin/settings/operations'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useBackupRuns() {
  return useQuery({
    queryKey: ['admin', 'backups', 'runs'],
    queryFn: () => api.get<BackupRun[]>('/admin/backups/runs'),
    staleTime: 1000 * 60, // 1 minute
  });
}

// --- Archive Queries ---

export function useArchivedAuditLogs(params: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['admin', 'archives', 'audit-logs', params],
    queryFn: () => archivesApi.getAuditLogs(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useArchivedBorrowRequests(params: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['admin', 'archives', 'borrow-requests', params],
    queryFn: () => archivesApi.getBorrowRequests(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// --- Mutations ---

export function useAdminSettingMutations() {
  const queryClient = useQueryClient();

  const invalidateSettings = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    queryClient.invalidateQueries({ queryKey: ['auth', 'settings'] });
  };

  const createSetting = useMutation({
    mutationFn: (data: SystemSettingCreate) => settingsApi.create(data),
    onSuccess: () => {
      invalidateSettings();
      toast.success('System setting created');
    },
  });

  const updateSetting = useMutation({
    mutationFn: ({ key, value, category }: { key: string; value: string; category?: string }) =>
      settingsApi.update(key, value, category),
    onSuccess: () => {
      invalidateSettings();
      toast.success('System setting updated');
    },
  });

  const deleteSetting = useMutation({
    mutationFn: ({ key, category }: { key: string; category?: string }) =>
      settingsApi.delete(key, category),
    onSuccess: () => {
      invalidateSettings();
      toast.success('Setting deleted');
    },
  });

  const restoreSetting = useMutation({
    mutationFn: ({ key, category }: { key: string; category?: string }) =>
      settingsApi.restore(key, category),
    onSuccess: () => {
      invalidateSettings();
      toast.success('Setting restored');
    },
  });

  const createAuthSetting = useMutation({
    mutationFn: (data: SystemSettingCreate) => settingsApi.createAuth(data),
    onSuccess: () => {
      invalidateSettings();
      toast.success('Auth configuration updated');
    },
  });

  return {
    createSetting,
    updateSetting,
    deleteSetting,
    restoreSetting,
    createAuthSetting,
  };
}

export function useOperationsMutations() {
  const queryClient = useQueryClient();

  const updateOperations = useMutation({
    mutationFn: (data: OperationsSettingsData) => api.put('/admin/settings/operations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'operations'] });
      toast.success('System operations updated successfully');
    },
  });

  return { updateOperations };
}

export function useGeneralMutations() {
  const queryClient = useQueryClient();

  const updateGeneral = useMutation({
    mutationFn: (data: GeneralSettingsData) => api.put('/admin/settings/general', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'general'] });
      toast.success('General settings updated successfully');
    },
  });

  return { updateGeneral };
}

export function useBrandingMutations() {
  const queryClient = useQueryClient();

  const updateBranding = useMutation({
    mutationFn: (data: BrandingSettingsData) => api.put('/admin/settings/branding', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'branding'] });
      toast.success('Branding settings updated successfully');
    },
  });

  const uploadBrandingFile = useMutation({
    mutationFn: (formData: FormData) => api.post<{ url: string }>('/admin/settings/branding/upload', formData),
    onSuccess: () => {
      // We don't invalidate here yet because we update the local state in the component, 
      // but we could invalidate to be safe.
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'branding'] });
    }
  });

  return { updateBranding, uploadBrandingFile };
}

export function useBackupMutations() {
  const queryClient = useQueryClient();

  const triggerBackup = useMutation({
    mutationFn: (data: { destination: string }) => api.post('/admin/backups/trigger', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups', 'runs'] });
      toast.success('Backup triggered successfully');
    },
  });

  const deleteBackup = useMutation({
    mutationFn: (backupId: string) => api.delete(`/admin/backups/runs/${backupId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups', 'runs'] });
      toast.success('Backup deleted');
    },
  });

  return { triggerBackup, deleteBackup };
}

export function useHealthMutations() {
  const queryClient = useQueryClient();

  const terminateSession = useMutation({
    mutationFn: (sessionId: string) => healthApi.terminateSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'health', 'sessions'] });
      toast.success('Session terminated');
    },
  });

  return { terminateSession };
}

export function useArchiveMutations() {
  const queryClient = useQueryClient();

  const restoreArchive = useMutation({
    mutationFn: ({ entityType, id }: { entityType: 'audit-log' | 'borrow-request'; id: string }) =>
      archivesApi.restore(entityType, id),
    onSuccess: (_, { entityType }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'archives', entityType === 'audit-log' ? 'audit-logs' : 'borrow-requests'] });
      toast.success('Record restored from archive');
    },
  });

  const updateArchiveTags = useMutation({
    mutationFn: ({ entityType, id, tags }: { entityType: 'audit-log' | 'borrow-request'; id: string; tags: string[] }) =>
      archivesApi.updateTags(entityType, id, tags),
    onSuccess: (_, { entityType }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'archives', entityType === 'audit-log' ? 'audit-logs' : 'borrow-requests'] });
      toast.success('Archive tags updated');
    },
  });

  return { restoreArchive, updateArchiveTags };
}
