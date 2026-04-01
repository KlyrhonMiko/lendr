import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { toast } from 'sonner';

export interface ImportHistoryErrorLogEntry {
  row?: number | string;
  error?: string;
  data?: Record<string, unknown>;
}

interface ImportMutationResult {
  status: string;
  success_count?: number;
  error_count?: number;
  success?: number;
  failed?: number;
}

export interface ImportHistoryItem {
  id: string;
  filename: string;
  actor_id: string;
  total_rows: number;
  success_count: number;
  error_count: number;
  status: string;
  created_at: string;
  error_log?: ImportHistoryErrorLogEntry[];
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function useImportHistory(page: number, perPage: number) {
  return useQuery({
    queryKey: ['inventory', 'import', 'history', page, perPage],
    queryFn: async () => {
      const response = await api.get<ImportHistoryItem[]>(`/inventory/data/import/history?page=${page}&per_page=${perPage}`);
      return response;
    },
  });
}

export function useImportInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, mode }: { file: File; mode: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post<ImportMutationResult>(`/inventory/data/import?mode=${mode}`, formData);
      return response.data;
    },
    onSuccess: (data: ImportMutationResult) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'import', 'history'] });
      // Also invalidate items as they might have been updated/added
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });

      const successCount = data.success_count ?? data.success ?? 0;
      const errorCount = data.error_count ?? data.failed ?? 0;
      
      if (data.status === 'completed') {
        toast.success('Import completed successfully');
      } else if (data.status === 'partial_success') {
        toast.warning(`Imported with some errors (${successCount} success, ${errorCount} failed)`);
      } else if (data.status === 'failed') {
        toast.error('Import failed completely. Check history for details.');
      } else {
        toast.success('Import process initiated');
      }
    },
    onError: (err: unknown) => {
      toast.error(resolveErrorMessage(err, 'Import failed'));
    }
  });
}

export function useExportData() {
  return {
    exportData: async (type: string, params: Record<string, unknown>) => {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '') {
          queryParams.append(key, String(val));
        }
      });
      
      const endpointMap: Record<string, string> = {
        'catalog': '/inventory/data/export/catalog',
        'audit': '/inventory/data/export/audit-logs',
        'requests': '/inventory/data/export/ledger/requests',
        'movements': '/inventory/data/export/ledger/movements'
      };

      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api${endpointMap[type]}?${queryParams.toString()}`;
      
      // We need to fetch with auth headers, then create a blob
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${auth.getToken()}`
          }
        });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `${type}_export.${params.format || 'csv'}`;
        if (contentDisposition) {
            const matches = /filename="?([^";]+)"?/.exec(contentDisposition);
            if (matches && matches[1]) filename = matches[1];
        }
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success('File downloaded successfully');
      } catch (err: unknown) {
        toast.error(resolveErrorMessage(err, 'Export failed'));
      }
    }
  };
}

export function useDownloadTemplate() {
    return {
        downloadTemplate: async () => {
            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/inventory/data/import/template`;
            try {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${auth.getToken()}`
                    }
                });
                if (!response.ok) throw new Error('Template download failed');
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.setAttribute('download', 'inventory_import_template.csv');
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(downloadUrl);
              } catch (err: unknown) {
                toast.error(resolveErrorMessage(err, 'Download failed'));
            }
        }
    }
}
