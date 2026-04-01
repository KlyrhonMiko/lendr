'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/auth';

export function AuthGuard({
  children,
  redirectTo = '/auth/login',
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading && !auth.isAuthenticated()) {
      router.push(redirectTo);
    }
  }, [loading, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-8">
          {/* Animated logo */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-yellow-400/20 to-amber-600/20 blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-yellow-500/20 p-2">
              <Image
                src="/Image/Powergold Enterprise Logo.png"
                alt="Powergold"
                width={64}
                height={64}
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Brand + status */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-xl font-bold font-heading tracking-tight text-foreground">
              Powergold Engineering
            </span>
            <div className="flex flex-col items-center gap-4">
              {/* Progress bar */}
              <div className="w-36 h-1 rounded-full bg-border overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 animate-[shimmer_1.5s_ease-in-out_infinite]" />
              </div>
              <span className="text-sm text-muted-foreground">
                Verifying your session&hellip;
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
