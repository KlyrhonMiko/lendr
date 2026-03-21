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
  destination: string;
}

export const backupApi = {
  listRuns: () => api.get<BackupRun[]>('/admin/backups/runs'),
  
  triggerBackup: (data: BackupTriggerPayload) => 
    api.post<BackupRun>('/admin/backups/trigger', data),
    
  downloadArtifact: async (artifactId: string, filename: string) => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const { auth } = await import('@/lib/auth');
    const token = auth.getToken();
    
    const response = await fetch(`${API_BASE_URL}/api/admin/backups/artifacts/${artifactId}/download`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || 'Failed to download artifact');
    }

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
