export function ComingSoonCard() {
  return (
    <div className="p-8 rounded-3xl bg-card border border-border flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
        <span className="text-2xl">📊</span>
      </div>
      <h2 className="text-2xl font-bold font-heading">Dashboard Coming Soon</h2>
      <p className="text-muted-foreground max-w-sm">
        We are currently building the comprehensive system administration dashboard. Check back soon for metrics on system usage, health, and user activity.
      </p>
    </div>
  );
}

