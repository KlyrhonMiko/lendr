'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { Input, Textarea } from '@/components/ui/input';
import { FormSelect } from '@/components/ui/form-select';
import { Wrench, Database, Archive, Trash2, Clock, RefreshCw, FileText, Save, Plus, Download } from 'lucide-react';
import { ArchivesModal } from './ArchivesModal';
import { useOperationsSettings, useBackupRuns, useOperationsMutations, useBackupMutations } from '../lib/useSettingsQueries';

interface OperationsSettingsData {
  maintenance: {
    enabled: boolean;
    message: string;
  };
  backup_schedule: {
    enabled: boolean;
    frequency: string;
    time: string;
  };
  archive_policy: {
    audit_logs_value: number;
    audit_logs_unit: string;
    borrow_records_value: number;
    borrow_records_unit: string;
  };
  retention_policy: {
    auto_delete: boolean;
    delete_older_than_value: number;
    delete_older_than_unit: string;
    exclusion_list: string[];
    maintenance_time: string;
  };
}

export function OperationsSettings() {
  const [newExclusion, setNewExclusion] = useState('');
  const [showArchives, setShowArchives] = useState(false);
  const [localData, setLocalData] = useState<OperationsSettingsData | null>(null);

  // Queries
  const { data: operationsRes, isLoading: isLoadingOperations } = useOperationsSettings();
  const { data: backupRunsRes, isLoading: isLoadingBackups } = useBackupRuns();

  // Mutations
  const { updateOperations } = useOperationsMutations();
  const { downloadBackup } = useBackupMutations();

  const data = localData || operationsRes?.data || null;
  const backups = backupRunsRes?.data || [];
  const loading = isLoadingOperations || isLoadingBackups;
  const saving = updateOperations.isPending;

  useEffect(() => {
    if (operationsRes?.data && !localData) {
      setLocalData(operationsRes.data);
    }
  }, [operationsRes, localData]);

  const handleSave = async () => {
    if (!data) return;
    updateOperations.mutate(data, {
      onSuccess: () => setLocalData(null)
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Maintenance Mode */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Enable Maintenance Mode</CardTitle>
              <CardDescription>Block user access to the platform for scheduled repairs or updates.</CardDescription>
            </div>
            <Toggle
              label={data.maintenance.enabled ? "Active" : "Inactive"}
              checked={data.maintenance.enabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                ...prev,
                maintenance: { ...prev.maintenance, enabled: e.target.checked }
              } : null)}
            />
          </CardHeader>
          <CardContent className={data.maintenance.enabled ? "space-y-6 opacity-100 transition-opacity" : "space-y-6 opacity-50 grayscale pointer-events-none transition-opacity"}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground px-1">Custom Maintenance Message</label>
              <Textarea
                value={data.maintenance.message}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                  ...prev,
                  maintenance: { ...prev.maintenance, message: e.target.value }
                } : null)}
              />
            </div>

            {/* Time scheduling removed per user request for simplicity */}
          </CardContent>
        </Card>

        {/* Automated Backup Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Database className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Automated Backup Schedule</CardTitle>
              <CardDescription>Schedule local database backups that are stored in the deployment backup folder.</CardDescription>
            </div>
            <Toggle
              label={data.backup_schedule.enabled ? 'Enabled' : 'Disabled'}
              checked={data.backup_schedule.enabled}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                ...prev,
                backup_schedule: { ...prev.backup_schedule, enabled: e.target.checked }
              } : null)}
            />
          </CardHeader>
          <CardContent className={data.backup_schedule.enabled ? 'grid gap-6' : 'grid gap-6 opacity-50 grayscale pointer-events-none transition-opacity'}>
            <FormSelect
              label="Frequency"
              value={data.backup_schedule.frequency}
              onChange={(value) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                ...prev,
                backup_schedule: { ...prev.backup_schedule, frequency: value }
              } : null)}
              options={[
                { label: 'Daily', key: 'daily' },
                { label: 'Weekly', key: 'weekly' },
                { label: 'Monthly', key: 'monthly' }
              ]}
              placeholder="Select frequency"
            />
            <Input
              label="Backup Time"
              type="time"
              value={data.backup_schedule.time}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                ...prev,
                backup_schedule: { ...prev.backup_schedule, time: e.target.value }
              } : null)}
            />
            <p className="text-xs text-muted-foreground px-1">
              Local backups only. Manual and scheduled backups are saved to the same server-side backup directory.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Backup History */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-2 border-none bg-transparent">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <Clock className="w-5 h-5" />
          </div>
          <CardTitle className="text-lg">Backup History</CardTitle>
        </CardHeader>
        <CardContent className="p-0 border-t border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Target</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic">No backup history available</td>
                  </tr>
                ) : backups.map((backup) => (
                  <tr key={backup.backup_id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-medium">{backup.started_at}</td>
                    <td className="px-6 py-4">{formatSize(backup.artifacts[0]?.size_bytes || 0)}</td>
                    <td className="px-6 py-4 capitalize">{backup.destination}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 ${backup.status === 'completed' ? 'text-emerald-500' : backup.status === 'running' ? 'text-blue-500' : 'text-rose-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${backup.status === 'completed' ? 'bg-emerald-500' : backup.status === 'running' ? 'bg-blue-500' : 'bg-rose-500'}`} />
                        {backup.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          const artifact = backup.artifacts[0];
                          if (!artifact) {
                            return;
                          }
                          downloadBackup.mutate({
                            artifactId: artifact.artifact_id,
                            filename: artifact.file_path_or_key.split('/').pop() || `${backup.backup_id}.sql`,
                          });
                        }}
                        aria-label="Download backup"
                        className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors disabled:opacity-50"
                        title="Download"
                        disabled={downloadBackup.isPending || backup.artifacts.length === 0}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Archives & Retention */}
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-500">
              <Archive className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>System Archives</CardTitle>
              <CardDescription>Set aging policies for moving records to long-term storage.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-end gap-3">
              <Input
                label="Archive audit logs older than:"
                type="number"
                className="flex-1"
                value={data.archive_policy.audit_logs_value}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                  ...prev,
                  archive_policy: { ...prev.archive_policy, audit_logs_value: parseInt(e.target.value) || 0 }
                } : null)}
              />
              <FormSelect
                options={[{ label: 'Days', key: 'd' }, { label: 'Months', key: 'm' }]}
                value={data.archive_policy.audit_logs_unit}
                onChange={(value) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                  ...prev,
                  archive_policy: { ...prev.archive_policy, audit_logs_unit: value }
                } : null)}
                className="w-[110px]"
                placeholder="Unit"
              />
            </div>
            <div className="flex items-end gap-3">
              <Input
                label="Archive borrow records older than:"
                type="number"
                className="flex-1"
                value={data.archive_policy.borrow_records_value}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                  ...prev,
                  archive_policy: { ...prev.archive_policy, borrow_records_value: parseInt(e.target.value) || 0 }
                } : null)}
              />
              <FormSelect
                options={[{ label: 'Days', key: 'd' }, { label: 'Months', key: 'm' }, { label: 'Years', key: 'y' }]}
                value={data.archive_policy.borrow_records_unit}
                onChange={(value) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                  ...prev,
                  archive_policy: { ...prev.archive_policy, borrow_records_unit: value }
                } : null)}
                className="w-[110px]"
                placeholder="Unit"
              />
            </div>
            <button
              onClick={() => setShowArchives(true)}
              className="w-full py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold border border-border mt-2 flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
            >
              <FileText className="w-4 h-4" />
              View Archived Records
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Data Retention Policy</CardTitle>
              <CardDescription>Automatically purge archived data to comply with regulations.</CardDescription>
            </div>
            <Toggle
              checked={data.retention_policy.auto_delete}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                ...prev,
                retention_policy: { ...prev.retention_policy, auto_delete: e.target.checked }
              } : null)}
            />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-end gap-3">
              <Input
                label="Auto-delete records older than:"
                type="number"
                className="flex-1"
                value={data.retention_policy.delete_older_than_value}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                  ...prev,
                  retention_policy: { ...prev.retention_policy, delete_older_than_value: parseInt(e.target.value) || 0 }
                } : null)}
              />
              <FormSelect
                options={[{ label: 'Years', key: 'y' }, { label: 'Months', key: 'm' }]}
                value={data.retention_policy.delete_older_than_unit}
                onChange={(value) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                  ...prev,
                  retention_policy: { ...prev.retention_policy, delete_older_than_unit: value }
                } : null)}
                className="w-[110px]"
                placeholder="Unit"
              />
            </div>
            <div className="space-y-2">
              <Input
                label="Daily Maintenance Window"
                type="time"
                value={data.retention_policy.maintenance_time}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalData((prev: OperationsSettingsData | null) => prev ? {
                  ...prev,
                  retention_policy: { ...prev.retention_policy, maintenance_time: e.target.value }
                } : null)}
              />
              <p className="text-[10px] text-muted-foreground italic px-1 mt-1">
                System-wide archival and purging tasks will run daily at this time.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground px-1">Exclusion List (Mark as Never Purge)</label>
              <div className="flex flex-wrap gap-2">
                {data.retention_policy.exclusion_list.map((tag: string, idx: number) => (
                  <span key={tag} className="px-3 py-1 bg-muted rounded-lg text-xs font-medium border border-border flex items-center gap-1.5">
                    {tag}
                    <Trash2
                      className="w-3 h-3 text-muted-foreground hover:text-rose-500 cursor-pointer transition-colors"
                      onClick={() => {
                        setLocalData((prev: OperationsSettingsData | null) => {
                          if (!prev) return null;
                          const newList = [...prev.retention_policy.exclusion_list];
                          newList.splice(idx, 1);
                          return {
                            ...prev,
                            retention_policy: { ...prev.retention_policy, exclusion_list: newList }
                          };
                        });
                      }}
                    />
                  </span>
                ))}
                <div className="flex gap-2 w-full mt-2">
                  <Input
                    placeholder="Add tag..."
                    className="h-8 text-xs flex-1"
                    value={newExclusion}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewExclusion(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      if (newExclusion.trim()) {
                        setLocalData((prev: OperationsSettingsData | null) => prev ? {
                          ...prev,
                          retention_policy: {
                            ...prev.retention_policy,
                            exclusion_list: [...prev.retention_policy.exclusion_list, newExclusion.trim()]
                          }
                        } : null);
                        setNewExclusion('');
                      }
                    }}
                    className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Processing changes...' : 'Save Operations Configuration'}
        </button>
      </div>
      <ArchivesModal
        isOpen={showArchives}
        onClose={() => setShowArchives(false)}
      />
    </div>
  );
}
