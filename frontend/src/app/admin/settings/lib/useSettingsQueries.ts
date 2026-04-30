import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  settingsApi,
  healthApi,
  archivesApi,
  securitySettingsApi,
  SettingsListParams,
  SystemSettingCreate,
  GeneralSettingsData,
  BrandingSettingsData,
  OperationsSettingsData,
  SecuritySettingsData,
} from '../api';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { BackupRun } from '../../backup/api';

const STALE_TIME_CONFIG = Infinity;
const STALE_TIME_LIST = 1000 * 30; // 30 seconds
const STALE_TIME_HEALTH = 1000 * 15; // 15 seconds

export interface RbacOverviewRow {
  role: string;
  displayName: string;
  permissions: string[];
  userCount: number;
}

export interface SecurityShiftConfig {
  key: string;
  label: string;
  start: string;
  end: string;
  days: number[];
}

export interface SecuritySettingsViewData {
  security: SecuritySettingsData;
  rbacRows: RbacOverviewRow[];
  shiftConfigs: SecurityShiftConfig[];
}

function formatRoleLabel(role: string): string {
  return role
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeShiftDays(days: number[]): number[] {
  return [...new Set(days)].filter((day) => day >= 0 && day <= 6).sort((left, right) => left - right);
}

function buildRbacRows(securitySettings: SecuritySettingsData): RbacOverviewRow[] {
  return securitySettings.rbac_overview.role_definitions
    .map((definition) => ({
      role: definition.role,
      displayName: definition.display_name?.trim() || formatRoleLabel(definition.role),
      permissions: definition.permissions,
      userCount: definition.user_count,
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function buildShiftConfigs(securitySettings: SecuritySettingsData): SecurityShiftConfig[] {
  const definitionsByKey = new Map(
    securitySettings.shift_definitions.definitions.map((definition) => [definition.key, definition]),
  );

  const orderedKeys = securitySettings.shift_definitions.values.length
    ? securitySettings.shift_definitions.values
    : securitySettings.shift_definitions.definitions.map((definition) => definition.key);

  const uniqueKeys = [...new Set(orderedKeys)];

  return uniqueKeys
    .map((key) => {
      const definition = definitionsByKey.get(key);
      return {
        key,
        label: definition?.label ?? formatRoleLabel(key),
        start: definition?.start ?? '08:00',
        end: definition?.end ?? '17:00',
        days: normalizeShiftDays(definition?.days ?? [1, 2, 3, 4, 5]),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

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
    queryFn: () => api.get<GeneralSettingsData>('/admin/settings/general/'),
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
    // Backend router is mounted at a slash-only path; use canonical URL to avoid redirect/CORS issues.
    queryFn: () => api.get<OperationsSettingsData>('/admin/settings/operations/'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useSecuritySettingsViewData() {
  return useQuery({
    queryKey: ['admin', 'settings', 'security', 'view'],
    queryFn: async () => {
      const securityRes = await securitySettingsApi.get();
      const security = securityRes.data;
      const rbacRows = buildRbacRows(security);
      const shiftConfigs = buildShiftConfigs(security);

      return {
        security,
        rbacRows,
        shiftConfigs,
      } satisfies SecuritySettingsViewData;
    },
    staleTime: STALE_TIME_LIST,
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
    mutationFn: (data: OperationsSettingsData) => api.put('/admin/settings/operations/', data),
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
    mutationFn: (data: GeneralSettingsData) => api.put('/admin/settings/general/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'general'] });
      toast.success('General settings updated successfully');
    },
  });

  return { updateGeneral };
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

  const downloadBackup = useMutation({
    mutationFn: async ({ artifactId, filename }: { artifactId: string; filename: string }) => {
      const response = await api.getRaw(`/admin/backups/artifacts/${artifactId}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    },
    onSuccess: () => {
      toast.success('Backup downloaded successfully');
    },
  });

  return { triggerBackup, downloadBackup };
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

export function useSecuritySettingsMutations() {
  const queryClient = useQueryClient();

  const saveSecuritySettings = useMutation({
    mutationFn: (payload: SecuritySettingsData) => securitySettingsApi.update(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'security'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'security', 'view'] }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'settings', 'configurations'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'config', 'users_shift_type'] }),
      ]);
      toast.success('Security settings updated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update security settings');
    },
  });

  return { saveSecuritySettings };
}
