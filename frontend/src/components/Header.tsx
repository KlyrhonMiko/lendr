'use client';

import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full h-20 bg-background/50 backdrop-blur-md border-b border-border flex items-center justify-between px-8">
      <div></div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 p-[2px]">
              <div className="w-full h-full rounded-full border-2 border-background overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'User'}`} 
                  alt="User Avatar" 
                  className="w-full h-full object-cover bg-indigo-50/10" 
                />
              </div>
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-foreground leading-none">
                {user ? `${user.first_name} ${user.last_name}` : 'Loading...'}
              </span>
              <span className="text-xs text-muted-foreground mt-1 capitalize">
                {user?.role.replace('_', ' ') || 'User'}
              </span>
            </div>
          </div>
          <button
            onClick={() => void logout()}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/60 hover:bg-destructive/5 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
