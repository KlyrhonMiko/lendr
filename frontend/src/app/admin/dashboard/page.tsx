import { ComingSoonCard } from './components/ComingSoonCard';
import { DashboardHeader } from './components/DashboardHeader';
import { QuickAccessPanel } from './components/QuickAccessPanel';

export default function AdminDashboard() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <DashboardHeader />

      <div className="grid md:grid-cols-2 gap-6">
        <ComingSoonCard />
        <QuickAccessPanel />
      </div>
    </div>
  );
}
