'use client';

import React from 'react';
import { Wrench, RefreshCw, LogOut } from 'lucide-react';
import { auth } from '@/lib/auth';

export function MaintenanceOverlay() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-card border border-border shadow-2xl rounded-3xl p-8 text-center space-y-8 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/15 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-yellow-400/15 blur-3xl rounded-full" />

        <div className="relative">
          <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-6 transform hover:rotate-12 transition-transform duration-500">
            <Wrench className="w-10 h-10" />
          </div>

          <h1 className="text-3xl font-black tracking-tight text-foreground mb-3">
            System Maintenance
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            We're currently performing scheduled maintenance to improve your experience.
            Most features are temporarily unavailable.
          </p>
        </div>

        <div className="grid gap-3 pt-4">
          <button
            onClick={handleRefresh}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
          >
            <RefreshCw className="w-5 h-5" />
            Check Again
          </button>
          
          <button
            onClick={() => auth.logout()}
            className="w-full py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-secondary/80 active:scale-[0.98] transition-all border border-border"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          Powergold Engineering Enterprises Platform
        </p>
      </div>
    </div>
  );
}
