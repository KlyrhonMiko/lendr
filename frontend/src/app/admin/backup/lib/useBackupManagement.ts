import { useState, useCallback, useEffect } from 'react';
import { backupApi, BackupRun } from '../api';
import { toast } from 'sonner';

export function useBackupManagement() {
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await backupApi.listRuns();
      if (response.status === 'success') {
        setRuns(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to list backup runs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const triggerBackup = async (destination: string) => {
    setTriggering(true);
    try {
      const response = await backupApi.triggerBackup({ destination });
      if (response.status === 'success') {
        toast.success(`Backup triggered successfully: ${response.data.backup_id}`);
        fetchRuns();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to trigger backup');
    } finally {
      setTriggering(false);
    }
  };

  const handleDownload = async (artifactId: string, filename: string) => {
    try {
      toast.info('Downloading backup...');
      await backupApi.downloadArtifact(artifactId, filename);
      toast.success('Backup downloaded successfully', { id: `download-${artifactId}` });
    } catch (error: any) {
      toast.error(error.message || 'Failed to download backup', { id: `download-${artifactId}` });
    }
  };

  return {
    runs,
    loading,
    triggering,
    triggerBackup,
    handleDownload,
    refreshRuns: fetchRuns, // Provide a way to manually refresh
  };
}
