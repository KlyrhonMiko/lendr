'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, ChevronRight } from 'lucide-react';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  const breadcrumbs = pathname
    .split('/')
    .filter(Boolean)
    .map((seg) =>
      seg.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    );

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-background/60 backdrop-blur-md border-b border-border flex items-center justify-between px-6 shrink-0">
      {/* Left: hamburger + breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav className="hidden sm:flex items-center gap-1 text-xs font-semibold min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
              )}
              <span
                className={`truncate tracking-wide ${i === breadcrumbs.length - 1
                    ? 'text-primary px-2 py-0.5 bg-primary/10 rounded-md shadow-sm'
                    : 'text-muted-foreground/60 hover:text-foreground transition-colors'
                  }`}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right: user info + sign out */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden md:flex flex-col text-right">
          <span className="text-xs font-bold text-foreground leading-tight tracking-tight">
            {loading
              ? 'Loading...'
              : user
                ? `${user.first_name} ${user.last_name}`
                : 'Guest'}
          </span>
          <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest leading-tight mt-0.5">
            {loading ? 'Loading...' : user?.role.replace('_', ' ') || 'User'}
          </span>
        </div>

        <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

        <button
          onClick={() => void logout()}
          aria-label="Sign out"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 border border-transparent hover:border-destructive/10 transition-all active:scale-95"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-wider">Logout</span>
        </button>
      </div>
    </header>
  );
}
