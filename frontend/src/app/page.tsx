'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { usePublicBranding } from '@/lib/publicBranding';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { brandName } = usePublicBranding();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push(auth.getRedirectPath(user.role));
      } else {
        router.push('/auth/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 animate-pulse">
        <span className="text-white font-bold text-3xl font-heading">{brandName.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">Authenticating session...</span>
      </div>
    </div>
  );
}
