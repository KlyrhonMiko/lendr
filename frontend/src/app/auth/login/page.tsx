'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, User, Loader2, ArrowRight, ShieldCheck, Package, ScanLine } from 'lucide-react';
import { auth } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { loginApi } from './api';
import { toast } from "sonner";
import {
  AuthApiError,
  FirstLoginPasswordChangeRequiredResponse,
  TwoFactorChallengeResponse,
} from '@/lib/api';

interface LoginCredentials {
  username: string;
  password: string;
}

interface ActiveTwoFactorChallenge {
  challengeToken: string;
  expiresAt: string;
  method: string;
}

const MIN_TWO_FACTOR_CODE_LENGTH = 6;

function formatIsoDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default function LoginPage() {
  const router = useRouter();
  const { hydrateUser } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTwoFactorChallenge, setActiveTwoFactorChallenge] =
    useState<ActiveTwoFactorChallenge | null>(null);
  const [showTwoFactorChallengeModal, setShowTwoFactorChallengeModal] = useState(false);
  const [twoFactorChallengeCode, setTwoFactorChallengeCode] = useState('');
  const [isVerifyingTwoFactorChallenge, setIsVerifyingTwoFactorChallenge] = useState(false);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationEndpoint, setRotationEndpoint] = useState<string | null>(null);
  const [rotationForm, setRotationForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const closeTwoFactorChallengeModal = () => {
    setShowTwoFactorChallengeModal(false);
    setActiveTwoFactorChallenge(null);
    setTwoFactorChallengeCode('');
  };

  const redirectToApp = (redirectPath: string) => {
    toast.success('Welcome back! Logging you in...');
    router.push(redirectPath);
  };

  const handleTokenLogin = async (accessToken: string) => {
    auth.setToken(accessToken);

    const user = await auth.getUser();
    hydrateUser(user);
    const redirectPath = auth.getRedirectPath(user?.role);

    redirectToApp(redirectPath);
  };

  const openTwoFactorChallengeModal = (challenge: TwoFactorChallengeResponse) => {
    setActiveTwoFactorChallenge({
      challengeToken: challenge.challenge_token,
      expiresAt: challenge.challenge_expires_at,
      method: challenge.method,
    });
    setTwoFactorChallengeCode('');
    setShowTwoFactorChallengeModal(true);
    toast.info('Two-factor authentication is required. Enter your authenticator code.');
  };

  const openRotationModal = (
    branch: FirstLoginPasswordChangeRequiredResponse,
    currentPassword: string,
  ) => {
    setRotationEndpoint(loginApi.getRotationEndpoint(branch));
    setRotationForm({
      currentPassword,
      newPassword: '',
      confirmPassword: '',
    });
    setShowRotationModal(true);
    toast.info('This account must rotate password before first sign-in.');
  };

  const completeLogin = async (credentials: LoginCredentials) => {
    const data = await loginApi.login(credentials);

    if (loginApi.isPasswordChangeRequired(data)) {
      openRotationModal(data, credentials.password);
      return;
    }

    if (loginApi.isTwoFactorChallenge(data)) {
      openTwoFactorChallengeModal(data);
      return;
    }

    await handleTokenLogin(data.access_token);
  };

  const maybeOpenRotationGate = (error: unknown): boolean => {
    if (!(error instanceof AuthApiError) || error.status !== 403) {
      return false;
    }

    if (error.code !== 'AUTH.FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED') {
      return false;
    }

    setRotationEndpoint('/auth/first-login/rotate-password');
    setRotationForm({
      currentPassword: formData.password,
      newPassword: '',
      confirmPassword: '',
    });
    setShowRotationModal(true);
    toast.info('This account must rotate password before first sign-in.');
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

  const handleVerifyTwoFactorChallenge = async (e: React.FormEvent) => {
    e.preventDefault();

    const challenge = activeTwoFactorChallenge;
    if (!challenge) {
      toast.error('No active 2FA challenge found. Please sign in again.');
      closeTwoFactorChallengeModal();
      return;
    }

    const code = twoFactorChallengeCode.trim();
    if (code.length < MIN_TWO_FACTOR_CODE_LENGTH) {
      toast.error('Enter a valid authenticator code.');
      return;
    }

    setIsVerifyingTwoFactorChallenge(true);
    try {
      const token = await loginApi.verifyLoginTwoFactor(challenge.challengeToken, code);
      toast.success('Two-factor verification successful.');
      closeTwoFactorChallengeModal();
      await handleTokenLogin(token.access_token);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to verify authenticator code';
      toast.error(msg);
    } finally {
      setIsVerifyingTwoFactorChallenge(false);
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
      await loginApi.rotateFirstLoginPassword({
        username: formData.username,
        current_password: rotationForm.currentPassword,
        new_password: rotationForm.newPassword,
      }, rotationEndpoint ?? undefined);

      toast.success('Password rotated. Signing you in...');
      setShowRotationModal(false);
      setRotationEndpoint(null);

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
                className="w-full bg-background border border-border focus:border-primary/50 focus:ring-[3px] focus:ring-primary/10 rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all text-[15px]"
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
                className="w-full bg-background border border-border focus:border-primary/50 focus:ring-[3px] focus:ring-primary/10 rounded-xl py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all text-[15px]"
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
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary/15 text-[15px]"
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

      {/* Quick access links */}
      <div className="mt-5 space-y-2.5">
        <p className="text-xs text-center text-muted-foreground/60 font-medium uppercase tracking-wider">
          Quick Access
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/borrow"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-accent text-sm font-medium text-foreground transition-all hover:shadow-sm group"
          >
            <Package className="w-4 h-4 text-yellow-600 group-hover:scale-110 transition-transform" />
            Borrow
          </Link>
          <Link
            href="/scan"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-accent text-sm font-medium text-foreground transition-all hover:shadow-sm group"
          >
            <ScanLine className="w-4 h-4 text-yellow-600 group-hover:scale-110 transition-transform" />
            Scan QR
          </Link>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-5 flex items-center justify-center gap-2 text-muted-foreground/60">
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
          aria-labelledby="first-login-rotate-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 id="first-login-rotate-title" className="text-lg font-semibold text-foreground">
              Change first-login password
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
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-[3px] focus:ring-primary/10"
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
                  minLength={6}
                  value={rotationForm.newPassword}
                  onChange={(e) =>
                    setRotationForm({ ...rotationForm, newPassword: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-[3px] focus:ring-primary/10"
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
                  minLength={6}
                  value={rotationForm.confirmPassword}
                  onChange={(e) =>
                    setRotationForm({ ...rotationForm, confirmPassword: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-[3px] focus:ring-primary/10"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  onClick={() => {
                    setShowRotationModal(false);
                    setRotationEndpoint(null);
                  }}
                  disabled={isRotating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  disabled={isRotating}
                >
                  {isRotating ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTwoFactorChallengeModal && activeTwoFactorChallenge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="two-factor-challenge-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 id="two-factor-challenge-title" className="text-lg font-semibold text-foreground">
              Verify with authenticator app
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the one-time code from your authenticator app to complete sign-in.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Method: {activeTwoFactorChallenge.method} · Expires: {formatIsoDateTime(activeTwoFactorChallenge.expiresAt)}
            </p>

            <form onSubmit={handleVerifyTwoFactorChallenge} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="two-factor-login-code">
                  Authenticator code
                </label>
                <input
                  id="two-factor-login-code"
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  minLength={MIN_TWO_FACTOR_CODE_LENGTH}
                  maxLength={12}
                  value={twoFactorChallengeCode}
                  onChange={(e) => setTwoFactorChallengeCode(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-[3px] focus:ring-primary/10"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  onClick={closeTwoFactorChallengeModal}
                  disabled={isVerifyingTwoFactorChallenge}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  disabled={isVerifyingTwoFactorChallenge}
                >
                  {isVerifyingTwoFactorChallenge ? 'Verifying...' : 'Verify code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
