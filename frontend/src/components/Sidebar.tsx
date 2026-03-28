'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Settings, Activity,
  Users, ScrollText, ClipboardList, Box, X, Database
} from 'lucide-react';

const systemMeta: Record<string, string> = {
  admin: 'Administration',
  inventory: 'Inventory',
  borrow_portal: 'Borrow Portal',
};

const navigation = {
  admin: [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'System Logs', href: '/admin/audit_logs', icon: ScrollText },
    { name: 'Backup', href: '/admin/backup', icon: Database },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  inventory: [
    { name: 'Dashboard', href: '/inventory/dashboard', icon: LayoutDashboard },
    { name: 'Equipment', href: '/inventory/items', icon: Package },
    { name: 'Requests', href: '/inventory/requests', icon: ClipboardList },
    { name: 'Audit Logs', href: '/inventory/audit_logs', icon: ScrollText },
    { name: 'Ledger', href: '/inventory/ledger', icon: Activity },
    { name: 'Settings', href: '/inventory/settings', icon: Settings },
  ],
  borrow_portal: [
    { name: 'Request Form', href: '/borrow', icon: Box },
  ],
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const getSystem = () => {
    if (pathname.startsWith('/inventory')) return 'inventory';
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/borrow')) return 'borrow_portal';
    return null;
  };

  const system = getSystem();
  const navItems = system ? navigation[system as keyof typeof navigation] : [];
  const label = system ? systemMeta[system] : null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/25 backdrop-blur-sm z-40 lg:hidden
          transition-opacity duration-300
          ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col
          border-r border-sidebar-border
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-20 px-6 shrink-0 border-b border-sidebar-border/30 mb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-black text-xl font-heading">L</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold font-heading tracking-tight text-sidebar-foreground">
                Lendr
              </span>
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter -mt-1">
                Enterprise POS
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 -mr-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section label */}
        {label && (
          <div className="px-6 pt-4 pb-2 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
              {label}
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3.5 py-2.5 rounded-lg
                  text-[14px] font-semibold min-h-[44px]
                  transition-all duration-200
                  ${isActive
                    ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5'
                    : 'text-muted-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  }
                `}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-primary' : ''}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 shrink-0 border-t border-sidebar-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" />
              <span className="text-[10px] font-semibold text-muted-foreground/40">v1.2.4-STABLE</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-primary/20 animate-pulse" />
          </div>
        </div>
      </aside>
    </>
  );
}
