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
        <h1 className="text-3xl font-bold font-heading tracking-tight text-white">Welcome back</h1>
        <p className="text-zinc-400">Enter your credentials to access your account</p>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400 ml-1">Username</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 outline-none transition-all"
                placeholder="johndoe"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-medium text-zinc-400">Password</label>
              <Link href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</Link>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 outline-none transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
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

        <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
          <p className="text-zinc-400 text-sm">
            Accounts are created by administrators only.
          </p>
        </div>
      </div>
    </div>
  );
}
