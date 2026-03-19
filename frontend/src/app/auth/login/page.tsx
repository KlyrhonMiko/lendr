'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, User, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { loginApi } from './api';
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await loginApi.login(formData);
      auth.setToken(data.access_token);
      
      // Fetch user profile to get role
      const user = await auth.getUser();
      const redirectPath = auth.getRedirectPath(user?.role);
      
      toast.success("Welcome back! Logging you in...");
      router.push(redirectPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid username or password';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold font-heading tracking-tight text-foreground">Welcome back</h1>
        <p className="text-muted-foreground">Enter your credentials to access your account</p>
      </div>

      <div className="bg-card/50 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground ml-1">Username</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                className="w-full bg-background/50 border border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-2xl py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground outline-none transition-all"
                placeholder="johndoe"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-medium text-muted-foreground">Password</label>
              <Link href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">Forgot password?</Link>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                className="w-full bg-background/50 border border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-2xl py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground outline-none transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-muted-foreground text-sm">
            Accounts are created by administrators only.
          </p>
        </div>
      </div>
    </div>
  );
}
