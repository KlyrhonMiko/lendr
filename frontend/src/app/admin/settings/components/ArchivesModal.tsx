'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Archive, RotateCcw, Tag, Search, RefreshCw, FileText, Loader2, AlertCircle } from 'lucide-react';
import { archivesApi, ArchivedAuditLog, ArchivedBorrowRequest, settingsApi } from '../api';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

type ArchiveTab = 'audit' | 'borrow';

export function ArchivesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<ArchiveTab>('audit');
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<ArchivedAuditLog[]>([]);
  const [borrowRequests, setBorrowRequests] = useState<ArchivedBorrowRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'audit') {
        const res = await archivesApi.getAuditLogs();
        setAuditLogs(res.data);
      } else {
        const res = await archivesApi.getBorrowRequests();
        setBorrowRequests(res.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch archived records');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      
      // Fetch available tags from settings
      settingsApi.list({ search: 'retention_exclusion', category: 'operations_settings' })
        .then(res => {
          const setting = res.data.find(s => s.key === 'retention_exclusion');
          if (setting) {
            try {
              const tags = JSON.parse(setting.value);
              setAvailableTags(Array.isArray(tags) ? tags : []);
            } catch (e) {
              setAvailableTags(['permanent_record']); // Fallback
            }
          }
        })
        .catch(() => setAvailableTags(['permanent_record']));
    }
  }, [isOpen, activeTab, fetchData]);

  const handleRestore = async (id: string) => {
    const entityType = activeTab === 'audit' ? 'audit-log' : 'borrow-request';
    if (!window.confirm(`Are you sure you want to restore this ${activeTab === 'audit' ? 'log' : 'request'} from the archives?`)) return;

    setRestoringId(id);
    try {
      await archivesApi.restore(entityType, id);
      toast.success('Record restored successfully');
      // Refresh data
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to restore record');
    } finally {
      setRestoringId(null);
    }
  };

  const handleUpdateTags = async (id: string, tags: string[]) => {
    const entityType = activeTab === 'audit' ? 'audit-log' : 'borrow-request';
    
    try {
      await archivesApi.updateTags(entityType, id, tags);
      toast.success('Retention tags updated');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update tags');
    }
  };

  const toggleEditor = (id: string) => {
    if (editingTagsId === id) setEditingTagsId(null);
    else setEditingTagsId(id);
  };

  if (!isOpen) return null;

  const filteredLogs = auditLogs.filter(log => 
    log.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.audit_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.entity_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = borrowRequests.filter(req => 
    req.request_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.borrower_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-card border border-border shadow-2xl rounded-[2rem] overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading">System Archives Explorer</h2>
              <p className="text-xs text-muted-foreground font-medium">Browse and manage data moved to long-term storage.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-border/50 bg-muted/5 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex p-1 bg-secondary/50 rounded-xl border border-border/50 w-full sm:w-fit">
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'audit' ? 'bg-background text-primary shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4" />
              Audit Logs
            </button>
            <button
              onClick={() => setActiveTab('borrow')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'borrow' ? 'bg-background text-primary shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Borrow Requests
            </button>
          </div>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search archived ${activeTab === 'audit' ? 'logs' : 'requests'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
            />
          </div>

          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-3 bg-secondary/50 hover:bg-secondary rounded-xl border border-border/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted/5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Retrieving archives...</p>
            </div>
          ) : (
            <div className="p-0">
              <table className="w-full text-sm text-left relative border-collapse">
                <thead className="sticky top-0 bg-background/80 backdrop-blur-md z-10 text-muted-foreground font-bold shadow-sm">
                  <tr>
                    <th className="px-6 py-4 border-b border-border/50 uppercase text-[10px] tracking-wider">
                      {activeTab === 'audit' ? 'Log Details' : 'Request Info'}
                    </th>
                    <th className="px-6 py-4 border-b border-border/50 uppercase text-[10px] tracking-wider">Archived Date</th>
                    <th className="px-6 py-4 border-b border-border/50 uppercase text-[10px] tracking-wider">Retention Status</th>
                    <th className="px-6 py-4 border-b border-border/50 uppercase text-[10px] tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {activeTab === 'audit' ? (
                    filteredLogs.length === 0 ? (
                      <EmptyState />
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.audit_id} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="px-6 py-4 max-w-md">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-[10px] px-1.5 py-0.5 bg-muted rounded font-bold text-muted-foreground">
                                {log.audit_id}
                              </span>
                              <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                {log.action.toUpperCase()}
                              </span>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">
                                {log.entity_type}
                              </span>
                            </div>
                            <p className="text-xs font-semibold leading-relaxed text-foreground/90">
                              Modified: <span className="font-mono text-indigo-500">{log.entity_id}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">Original: {log.created_at}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold">{log.archived_at.split(' - ')[0]}</p>
                            <p className="text-[10px] text-muted-foreground">{log.archived_at.split(' - ')[1] || ''}</p>
                          </td>
                          <td className="px-6 py-4 relative">
                            <RetentionTags 
                              tags={log.retention_tags} 
                              onClick={() => toggleEditor(log.audit_id)} 
                            />
                            {editingTagsId === log.audit_id && (
                              <TagSelector 
                                selectedTags={log.retention_tags || []} 
                                availableTags={availableTags}
                                onUpdate={(tags) => handleUpdateTags(log.audit_id, tags)}
                                onClose={() => setEditingTagsId(null)}
                              />
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <ActionButtons 
                              onRestore={() => handleRestore(log.audit_id)}
                              loading={restoringId === log.audit_id}
                            />
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    filteredRequests.length === 0 ? (
                      <EmptyState />
                    ) : (
                      filteredRequests.map((req) => (
                        <tr key={req.request_id} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-muted rounded font-bold text-muted-foreground">
                                    {req.request_id}
                                </span>
                                {req.is_emergency && (
                                    <span className="text-[9px] font-bold text-rose-600 bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10">EMERGENCY</span>
                                )}
                            </div>
                            <p className="text-xs font-bold">{req.borrower_name || 'Anonymous Borrower'}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">Request Date: {req.request_date}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold">{req.archived_at.split(' - ')[0]}</p>
                            <p className="text-[10px] text-muted-foreground">{req.archived_at.split(' - ')[1] || ''}</p>
                          </td>
                          <td className="px-6 py-4 relative">
                            <RetentionTags 
                                tags={req.retention_tags} 
                                onClick={() => toggleEditor(req.request_id)} 
                            />
                            {editingTagsId === req.request_id && (
                              <TagSelector 
                                selectedTags={req.retention_tags || []} 
                                availableTags={availableTags}
                                onUpdate={(tags) => handleUpdateTags(req.request_id, tags)}
                                onClose={() => setEditingTagsId(null)}
                              />
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <ActionButtons 
                                onRestore={() => handleRestore(req.request_id)}
                                loading={restoringId === req.request_id}
                            />
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/50 bg-muted/20 flex items-center justify-between">
           <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <p className="text-[11px] font-medium italic select-none">
                 Restoring a record will move it back to active tables immediately.
              </p>
           </div>
           <button 
             onClick={onClose}
             className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
           >
              Close Archives
           </button>
        </div>
      </div>
    </div>
  );
}

function RetentionTags({ tags, onClick }: { tags: string[] | null, onClick: () => void }) {
    if (!tags || tags.length === 0) {
        return (
            <button 
                onClick={onClick}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors py-1 group"
            >
                <Tag className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase underline decoration-dotted">Set Tags</span>
            </button>
        );
    }

    return (
        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
            {tags.map((tag, index) => (
                <span key={`${tag}-${index}`} className="px-2 py-0.5 bg-indigo-500/5 text-indigo-600 border border-indigo-500/20 rounded text-[9px] font-bold uppercase tracking-tight">
                    {tag}
                </span>
            ))}
            <button 
                onClick={onClick}
                className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-colors bg-secondary/30"
                title="Edit Tags"
            >
                <Tag className="w-3 h-3" />
            </button>
        </div>
    );
}

function TagSelector({ 
  selectedTags, 
  availableTags, 
  onUpdate, 
  onClose 
}: { 
  selectedTags: string[], 
  availableTags: string[], 
  onUpdate: (tags: string[]) => void,
  onClose: () => void
}) {
  const toggleTag = (tag: string) => {
    let newTags;
    if (selectedTags.includes(tag)) {
      newTags = selectedTags.filter(t => t !== tag);
    } else {
      newTags = [...selectedTags, tag];
    }
    onUpdate(newTags);
  };

  return (
    <div className="absolute left-6 top-14 z-50 w-48 bg-card border border-border shadow-2xl rounded-2xl p-3 animate-in zoom-in-95 fade-in duration-200">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Tags</span>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
            <X className="w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {availableTags.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic px-1 py-2">No tags configured in system settings.</p>
        ) : (
          availableTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedTags.includes(tag) 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tag}
              {selectedTags.includes(tag) && <Check className="w-3 h-3" />}
            </button>
          ))
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-border/50">
         <p className="text-[9px] text-muted-foreground italic leading-tight px-1">
           Tags on the exclusion list prevent records from being permanently deleted.
         </p>
      </div>
    </div>
  );
}

function ActionButtons({ onRestore, loading }: { onRestore: () => void, loading: boolean }) {
    return (
        <div className="flex items-center justify-end gap-2 pr-2">
            <button 
                onClick={onRestore}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase shadow-sm shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Restore Log
            </button>
        </div>
    );
}

function EmptyState() {
    return (
        <tr>
            <td colSpan={4} className="px-6 py-24">
                <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                        <Archive className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-sm font-medium italic">No archived records found matching your current filters.</p>
                </div>
            </td>
        </tr>
    );
}
