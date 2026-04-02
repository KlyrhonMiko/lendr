import { useBackupRuns, useBackupMutations } from './useBackupQueries';

export function useBackupManagement() {
  const { data: runsRes, isLoading: loading, refetch: refreshRuns } = useBackupRuns();
  const { triggerBackup: triggerMut, downloadBackup: downloadMut } = useBackupMutations();

  const runs = runsRes?.data || [];
  const triggering = triggerMut.isPending;

  const triggerBackup = async (destination: 'local') => {
    triggerMut.mutate({ destination });
  };

  const handleDownload = async (artifactId: string, filename: string) => {
    downloadMut.mutate({ artifactId, filename });
  };

  return {
    runs,
    loading,
    triggering,
    triggerBackup,
    handleDownload,
    refreshRuns,
  };
}
