import { describe, expect, it } from 'vitest';
import { buildApiRequestUrl } from '@/lib/apiPath';
import { buildBackupArtifactDownloadPath } from '@/app/admin/backup/api';
import {
  buildExportDownloadPath,
  buildImportTemplateDownloadPath,
} from '@/app/inventory/settings/lib/useImportExport';

describe('same-origin download and import paths', () => {
  it('builds backup artifact download path as same-origin /api route', () => {
    const requestPath = buildBackupArtifactDownloadPath('ART-123');

    expect(requestPath).toBe('/admin/backups/artifacts/ART-123/download');
    expect(buildApiRequestUrl(requestPath)).toBe('/api/admin/backups/artifacts/ART-123/download');
  });

  it('builds export download path as same-origin /api route with query string', () => {
    const requestPath = buildExportDownloadPath('catalog', {
      format: 'xlsx',
      search: 'laptop',
      include_archived: false,
      empty: '',
      ignored: null,
    });

    expect(requestPath).toBe('/inventory/data/export/catalog?format=xlsx&search=laptop&include_archived=false');
    expect(buildApiRequestUrl(requestPath)).toBe('/api/inventory/data/export/catalog?format=xlsx&search=laptop&include_archived=false');
  });

  it('builds import template download path as same-origin /api route', () => {
    const requestPath = buildImportTemplateDownloadPath();

    expect(requestPath).toBe('/inventory/data/import/template');
    expect(buildApiRequestUrl(requestPath)).toBe('/api/inventory/data/import/template');
  });
});
