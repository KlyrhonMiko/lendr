'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, User, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/auth';
import { loginApi } from './api';
import { toast } from "sonner";
import { AuthApiError } from '@/lib/api';

const BOOTSTRAP_ROTATION_REQUIRED_TEXT =
  'bootstrap admin password rotation required';

interface LoginCredentials {
  username: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationForm, setRotationForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const completeLogin = async (credentials: LoginCredentials) => {
    const data = await loginApi.login(credentials);
    auth.setToken(data.access_token);

    const user = await auth.getUser();
    const redirectPath = auth.getRedirectPath(user?.role);

    toast.success("Welcome back! Logging you in...");
    router.push(redirectPath);
  };

  const maybeOpenRotationGate = (error: unknown): boolean => {
    if (!(error instanceof AuthApiError) || error.status !== 403) {
      return false;
    }

    if (!error.message.toLowerCase().includes(BOOTSTRAP_ROTATION_REQUIRED_TEXT)) {
      return false;
    }

    setRotationForm({
      currentPassword: formData.password,
      newPassword: '',
      confirmPassword: '',
    });
    setShowRotationModal(true);
    toast.info('Bootstrap admin must rotate password before first sign-in.');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await completeLogin(formData);
    } catch (err: unknown) {
      if (maybeOpenRotationGate(err)) {
        return;
      }
      const msg = err instanceof Error ? err.message : 'Invalid username or password';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRotatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      toast.error('Username is required before rotating password.');
      return;
    }
    if (!rotationForm.currentPassword || !rotationForm.newPassword) {
      toast.error('Current and new password are required.');
      return;
    }
    if (rotationForm.newPassword !== rotationForm.confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    if (rotationForm.newPassword === rotationForm.currentPassword) {
      toast.error('New password must be different from current password.');
      return;
    }

    setIsRotating(true);
    try {
      await loginApi.rotateBootstrapPassword({
        username: formData.username,
        current_password: rotationForm.currentPassword,
        new_password: rotationForm.newPassword,
      });

      toast.success('Password rotated. Signing you in...');
      setShowRotationModal(false);

      const nextCredentials = {
        username: formData.username,
        password: rotationForm.newPassword,
      };
      setFormData(nextCredentials);
      await completeLogin(nextCredentials);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to rotate password';
      toast.error(msg);
    } finally {
      setIsRotating(false);
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
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60 group-focus-within:text-yellow-600 transition-colors">
                <User className="w-[18px] h-[18px]" />
              </div>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                className="w-full bg-background border border-border focus:border-yellow-500/50 focus:ring-[3px] focus:ring-yellow-500/10 rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all text-[15px]"
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
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60 group-focus-within:text-yellow-600 transition-colors">
                <KeyRound className="w-[18px] h-[18px]" />
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-background border border-border focus:border-yellow-500/50 focus:ring-[3px] focus:ring-yellow-500/10 rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all text-[15px]"
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
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-950 font-semibold py-3 rounded-xl hover:from-yellow-500 hover:to-yellow-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-yellow-500/15 text-[15px]"
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

      {showRotationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bootstrap-rotate-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 id="bootstrap-rotate-title" className="text-lg font-semibold text-foreground">
              Change bootstrap password
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This account must rotate its initial password before first sign-in.
            </p>

            <form onSubmit={handleRotatePassword} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="current-password">
                  Current password
                </label>
                <input
                  id="current-password"
                  type="password"
                  required
                  value={rotationForm.currentPassword}
                  onChange={(e) =>
                    setRotationForm({ ...rotationForm, currentPassword: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-indigo-500/50 focus:ring-[3px] focus:ring-indigo-500/10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="new-password">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  value={rotationForm.newPassword}
                  onChange={(e) =>
                    setRotationForm({ ...rotationForm, newPassword: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-indigo-500/50 focus:ring-[3px] focus:ring-indigo-500/10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="confirm-password">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  value={rotationForm.confirmPassword}
                  onChange={(e) =>
                    setRotationForm({ ...rotationForm, confirmPassword: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-indigo-500/50 focus:ring-[3px] focus:ring-indigo-500/10"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  onClick={() => setShowRotationModal(false)}
                  disabled={isRotating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  disabled={isRotating}
                >
                  {isRotating ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
