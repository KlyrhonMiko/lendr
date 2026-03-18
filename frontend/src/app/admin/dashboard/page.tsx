export default function AdminDashboard() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-heading mb-2">Platform Administration</h1>
          <p className="text-muted-foreground text-lg">System-wide monitoring and administrative tools.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-8 rounded-3xl bg-card border border-border flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
            <span className="text-2xl">📊</span>
          </div>
          <h2 className="text-2xl font-bold font-heading">Dashboard Coming Soon</h2>
          <p className="text-muted-foreground max-w-sm">
            We are currently building the comprehensive system administration dashboard. Check back soon for metrics on system usage, health, and user activity.
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-border">
            <h3 className="text-lg font-bold font-heading mb-2">Quick Access</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-background border border-border/50 text-sm">
                System Audit Logs are now available under the "Admin Audit Logs" section.
              </div>
              <div className="p-4 rounded-xl bg-background border border-border/50 text-sm">
                Authentication and Platform settings can be managed in "Admin Settings".
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
