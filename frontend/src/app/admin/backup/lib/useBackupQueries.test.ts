import { describe, expect, it } from 'vitest';

import { hasActiveBackupRuns } from './useBackupQueries';
import type { BackupRun } from '../api';


function buildRun(status: BackupRun['status']): BackupRun {
  return {
    backup_id: `BKRP-${status}`,
    started_at: '2026-04-30 02:00:00',
    completed_at: status === 'completed' ? '2026-04-30 02:01:00' : undefined,
    status,
    destination: 'local',
    artifacts: [],
  };
}


describe('hasActiveBackupRuns', () => {
  it('treats running backups as active', () => {
    expect(hasActiveBackupRuns([buildRun('running')])).toBe(true);
  });

  it('treats pending backups as active', () => {
    expect(hasActiveBackupRuns([buildRun('pending')])).toBe(true);
  });

  it('ignores completed and failed backups', () => {
    expect(hasActiveBackupRuns([buildRun('completed'), buildRun('failed')])).toBe(false);
  });
});
