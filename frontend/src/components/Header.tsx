'use client';

import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full h-20 bg-background/50 backdrop-blur-md border-b border-border flex items-center justify-between px-8">
      <div></div>
      
      <div className="flex items-center gap-6">
        <button className="relative text-muted-foreground hover:text-foreground transition-colors group">
          <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-background animate-pulse" />
        </button>
        <div className="h-8 w-px bg-border my-auto" />
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
          <button 
            onClick={logout}
            className="ml-2 p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all group"
            title="Logout"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
}
