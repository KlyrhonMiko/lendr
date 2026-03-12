'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, History, Settings, Box } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'POS / Borrow', href: '/pos', icon: Box },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Borrow History', href: '/borrows', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-background/80 backdrop-blur-xl border-r border-border flex flex-col pt-6 pb-4">
      <div className="flex items-center gap-3 px-6 mb-10">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="text-white font-bold text-xl font-heading">L</span>
        </div>
        <span className="text-2xl font-bold font-heading tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Lendr
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden ${
                isActive 
                  ? 'text-white' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/90 to-purple-600/90 rounded-xl" />
              )}
              {isActive && (
                <div className="absolute inset-0 opacity-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'group-hover:text-indigo-400 transition-colors'}`} />
                <span className="font-medium text-[15px]">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      
      <div className="px-6 mt-auto">
        <div className="p-4 rounded-xl bg-gradient-to-b from-border/50 to-transparent border border-border/50 text-sm">
          <p className="font-medium text-foreground mb-1 font-heading">Lendr POS</p>
          <p className="text-muted-foreground text-xs leading-relaxed">Enterprise Equipment Management System v1.0</p>
        </div>
      </div>
    </aside>
  );
}
