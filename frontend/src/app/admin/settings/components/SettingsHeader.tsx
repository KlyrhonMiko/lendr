'use client';

export function SettingsHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold font-heading tracking-tight text-foreground">System Administration</h1>
        <p className="text-muted-foreground/80 text-sm">Centralized platform configuration, system operations, and security audit tools.</p>
      </div>

    </div>
  );
}

