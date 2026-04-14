'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Settings, Activity,
  Users, ScrollText, ClipboardList, Box, X
} from 'lucide-react';
import { usePublicBranding } from '@/lib/publicBranding';

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
    { name: 'Profile', href: '/inventory/profile', icon: Users },
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
  const { brandName, logoUrl } = usePublicBranding();

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
        <div className="flex items-center justify-between h-20 px-6 shrink-0 border-b border-sidebar-border/30 mb-2 pt-2">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${brandName} logo`}
                width={36}
                height={36}
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold font-heading">
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-base font-bold font-heading tracking-tight text-sidebar-foreground uppercase leading-tight">
                {brandName}
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
