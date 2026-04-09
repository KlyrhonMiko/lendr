import { api } from '@/lib/api';

export interface BackupArtifact {
  artifact_id: string;
  target_type: string;
  file_path_or_key: string;
  size_bytes?: number;
  checksum?: string;
  verified_restore: boolean;
  created_at: string;
}

export interface BackupRun {
  backup_id: string;
  started_at: string;
  completed_at?: string;
  status: string;
  destination: string;
  checksum?: string;
  artifacts: BackupArtifact[];
}

export interface BackupTriggerPayload {
  destination: 'local';
}

export function buildBackupArtifactDownloadPath(artifactId: string): string {
  return `/admin/backups/artifacts/${artifactId}/download`;
}

export const backupApi = {
  listRuns: () => api.get<BackupRun[]>('/admin/backups/runs'),
  
  triggerBackup: (data: BackupTriggerPayload) => 
    api.post<BackupRun>('/admin/backups/trigger', data),
    
  downloadArtifact: async (artifactId: string, filename: string) => {
    const response = await api.getRaw(buildBackupArtifactDownloadPath(artifactId));

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};
