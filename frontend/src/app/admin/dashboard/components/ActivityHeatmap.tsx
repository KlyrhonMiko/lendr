import { ActivityPoint } from '../lib/types';
import { Activity } from 'lucide-react';

export function ActivityHeatmap({ activity, loading }: { activity: ActivityPoint[]; loading: boolean }) {
  const maxCount = Math.max(...activity.map(a => a.count), 1);
  
  // Create a 24-hour array to ensure all hours are shown even if count is 0
  const fullActivity = Array.from({ length: 24 }, (_, i) => {
    const found = activity.find(a => a.hour === i);
    return { hour: i, count: found ? found.count : 0 };
  });

  const formatHour = (h: number) => {
    const hour = h % 12 || 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour}${ampm}`;
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-sm">System Activity (24h Heatmap)</h3>
      </div>
      <div className="p-6 flex-1 flex items-end gap-1.5 min-h-[200px]">
        {loading ? (
          <div className="w-full h-full bg-muted animate-pulse rounded" />
        ) : (
          fullActivity.map((point) => (
            <div 
              key={point.hour} 
              className="flex-1 rounded-t-sm transition-all group relative cursor-help"
              style={{ 
                height: `${Math.max(4, (point.count / maxCount) * 100)}%`,
                backgroundColor: point.count === 0 ? 'rgba(var(--muted), 0.2)' : `rgba(59, 130, 246, ${Math.max(0.2, point.count / maxCount)})`
              }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border border-border rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-sm">
                <span className="font-bold">{point.count}</span> events at {formatHour(point.hour)}
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 text-[8px] text-muted-foreground opacity-50 group-hover:opacity-100">
                {formatHour(point.hour)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
