'use client';

import { useState } from 'react';
import { useBackupManagement } from './lib/useBackupManagement';
import { Database, Download, RefreshCw, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function BackupPage() {
  const { runs, loading, triggering, triggerBackup, handleDownload, refreshRuns } = useBackupManagement();
  const [destination, setDestination] = useState('local');

  const onTrigger = () => {
    triggerBackup(destination);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'in_progress':
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-500" />
            Database Backups
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage system database backups and download archives.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <select 
            className="w-full sm:w-auto h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="local">Local Only</option>
            <option value="s3">S3 Only</option>
            <option value="both">Both (Local & S3)</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={refreshRuns}
              disabled={loading}
              className="px-3 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center justify-center disabled:opacity-50"
              title="Refresh Runs"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onTrigger}
              disabled={triggering}
              className="flex-1 sm:flex-none h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {triggering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Trigger Backup
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">Started At</th>
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">Destination</th>
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">Completed At</th>
                <th className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                    {loading ? 'Loading backup runs...' : 'No back up runs found.'}
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr 
                    key={run.backup_id} 
                    className="border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors"
                  >
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {run.started_at}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(run.status)}
                        <span className="capitalize text-slate-700 dark:text-slate-200 font-medium">
                          {run.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300 uppercase text-xs font-semibold tracking-wider">
                      {run.destination}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {run.completed_at || '-'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {run.artifacts?.map(artifact => (
                        <button
                          key={artifact.artifact_id}
                          onClick={() => handleDownload(artifact.artifact_id, `backup_${run.destination}_${artifact.target_type}.sql`)}
                          className="p-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors ml-1 inline-flex"
                          title={`Download ${artifact.target_type}`}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      ))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
