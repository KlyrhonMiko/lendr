'use client';

import { Database, Loader2, Tag } from 'lucide-react';

export function LookupExplorer({
  loading,
  categories,
  onCategoryClick,
  tables,
  selectedTable,
  onSelectTable,
  columns,
}: {
  loading: boolean;
  categories: string[];
  onCategoryClick: (cat: string) => void;
  tables: string[];
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
  columns: string[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Categories */}
      <div className="md:col-span-1 space-y-4">
        <h2 className="text-xl font-bold font-heading flex items-center gap-2">
          <Tag className="w-5 h-5 text-indigo-400" />
          Active Categories
        </h2>
        <div className="bg-card border border-border rounded-3xl p-4 shadow-sm max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading...
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryClick(cat)}
                  className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary/80 border border-border transition-all text-xs font-bold"
                  type="button"
                >
                  {cat}
                </button>
              ))}
              {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories found.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Database Schema Explorer */}
      <div className="md:col-span-2 space-y-4">
        <h2 className="text-xl font-bold font-heading flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" />
          Schema Explorer
        </h2>
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row min-h-[400px]">
          <div className="w-full md:w-64 border-r border-border bg-muted/20 p-4 space-y-2 overflow-y-auto max-h-[600px]">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Tables</p>
            {tables.map((table) => (
              <button
                key={table}
                type="button"
                onClick={() => onSelectTable(table)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${selectedTable === table
                  ? 'bg-background text-indigo-400 shadow-sm border border-border'
                  : 'hover:bg-muted/50 text-muted-foreground'
                  }`}
              >
                {table}
              </button>
            ))}
          </div>
          <div className="flex-1 p-6">
            {selectedTable ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-mono text-emerald-400">{selectedTable}</h3>
                  <span className="text-xs text-muted-foreground">{columns.length} columns found</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {columns.map((col) => (
                    <div key={col} className="p-3 rounded-2xl bg-muted/30 border border-border/50 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium font-mono">{col}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                <Database className="w-12 h-12 opacity-10" />
                <p className="text-sm font-medium italic">Select a table to view its schema.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

