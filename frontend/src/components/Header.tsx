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

        <nav className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 shrink-0" />
              )}
              <span
                className={`truncate tracking-tight ${i === breadcrumbs.length - 1
                  ? 'text-primary px-2.5 py-1 bg-primary/5 rounded-lg border border-primary/10 shadow-sm'
                  : 'text-muted-foreground/40 hover:text-foreground transition-all duration-200'
                  }`}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right: user info + sign out */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden md:flex flex-col text-right">
          <span className="text-[12px] font-extrabold text-foreground leading-tight tracking-tight">
            {loading
              ? 'Loading...'
              : user
                ? `${user.first_name} ${user.last_name}`
                : 'Guest'}
          </span>
          <span className="text-[9px] font-black text-primary/80 uppercase tracking-[0.15em] leading-tight mt-0.5">
            {loading ? 'Loading...' : user?.role.replace('_', ' ') || 'User'}
          </span>
        </div>

        <div className="w-px h-8 bg-border/50 mx-1 hidden sm:block" />

        <button
          onClick={() => void logout()}
          aria-label="Sign out"
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 border border-transparent hover:border-destructive/10 transition-all active:scale-95 group"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline text-[10px] font-extrabold uppercase tracking-widest">Logout</span>
        </button>
      </div>
    </header>
  );
}
