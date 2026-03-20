export function QuickAccessPanel() {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-card border border-border">
        <h3 className="text-lg font-bold font-heading mb-2">Quick Access</h3>
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-background border border-border/50 text-sm">
            System Audit Logs are now available under the &quot;Admin Audit Logs&quot; section.
          </div>
          <div className="p-4 rounded-xl bg-background border border-border/50 text-sm">
            Authentication and Platform settings can be managed in &quot;Admin Settings&quot;.
          </div>
        </div>
      </div>
    </div>
  );
}

