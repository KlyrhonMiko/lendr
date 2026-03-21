'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, User, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/auth';
import { loginApi } from './api';
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await loginApi.login(formData);
      auth.setToken(data.access_token);
      
      const user = await auth.getUser();
      const redirectPath = auth.getRedirectPath(user?.role);
      
      toast.success("Welcome back! Logging you in...");
      router.push(redirectPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid username or password';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Heading */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold font-heading tracking-tight text-foreground mb-1.5">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to continue to your dashboard
        </p>
      </div>

      {/* Card */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium text-foreground ml-0.5">
              Username
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60 group-focus-within:text-indigo-500 transition-colors">
                <User className="w-[18px] h-[18px]" />
              </div>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                className="w-full bg-background border border-border focus:border-indigo-500/50 focus:ring-[3px] focus:ring-indigo-500/10 rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all text-[15px]"
                placeholder="Enter your username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground ml-0.5">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60 group-focus-within:text-indigo-500 transition-colors">
                <KeyRound className="w-[18px] h-[18px]" />
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-background border border-border focus:border-indigo-500/50 focus:ring-[3px] focus:ring-indigo-500/10 rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all text-[15px]"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-indigo-500/15 text-[15px]"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign in
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer note */}
      <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground/60">
        <ShieldCheck className="w-3.5 h-3.5" />
        <p className="text-xs">
          Accounts are managed by your administrator
        </p>
      </div>
    </div>
  );
}
