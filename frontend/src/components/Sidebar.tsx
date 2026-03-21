'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Settings, Activity,
  Users, ScrollText, ClipboardList, Box, X,
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
        <div className="flex items-center justify-between h-16 px-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/15">
              <span className="text-white font-bold text-lg font-heading">L</span>
            </div>
            <span className="text-xl font-bold font-heading tracking-tight text-sidebar-foreground">
              Lendr
            </span>
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
          <div className="px-5 pt-5 pb-2 shrink-0">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
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
                  flex items-center gap-3 px-3 py-2.5 rounded-xl
                  text-[14px] font-medium min-h-[44px]
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  }
                `}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-indigo-500' : ''}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 pb-4 pt-2 shrink-0 border-t border-sidebar-border/60">
          <div className="flex items-center gap-2 pt-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-muted-foreground/60">Lendr v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
