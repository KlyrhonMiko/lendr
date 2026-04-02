import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backupApi, BackupRun } from '../api';
import { toast } from 'sonner';

const STALE_TIME_BACKUP = 1000 * 60; // 1 minute

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useBackupRuns() {
  return useQuery({
    queryKey: ['admin', 'backups', 'runs'],
    queryFn: () => backupApi.listRuns(),
    staleTime: STALE_TIME_BACKUP,
    refetchInterval: (query) => {
      const data = query.state.data?.data as BackupRun[] | undefined;
      const possessesActiveRuns = data?.some(
        (run) => run.status === 'in_progress' || run.status === 'pending'
      );
      return possessesActiveRuns ? 3000 : false;
    },
  });
}

export function useBackupMutations() {
  const queryClient = useQueryClient();

  const triggerBackup = useMutation({
    mutationFn: (data: { destination: 'local' }) => backupApi.triggerBackup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups', 'runs'] });
      toast.success('Backup triggered successfully');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to trigger backup'));
    }
  });

  const downloadBackup = useMutation({
    mutationFn: ({ artifactId, filename }: { artifactId: string; filename: string }) => 
      backupApi.downloadArtifact(artifactId, filename),
    onSuccess: () => {
      toast.success('Backup downloaded successfully');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Failed to download backup'));
    }
  });

  return { triggerBackup, downloadBackup };
}
