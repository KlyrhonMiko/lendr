'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User, Mail, Lock, ShieldCheck, 
  ArrowRight, ArrowLeft, Loader2, AlertCircle,
  Briefcase, UserCircle
} from 'lucide-react';
import { registerApi } from './api';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';

const ROLES = [
  { value: 'accountant', label: 'Accountant' },
  { value: 'finance_manager', label: 'Finance Manager' },
  { value: 'dispatch', label: 'Dispatch' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'admin', label: 'Admin' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'inventory_manager',
    first_name: '',
    last_name: '',
    middle_name: '',
  });

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.push('/admin/dashboard');
      toast.error('Only admin users can register new accounts.');
    }
  }, [authLoading, router, user?.role]);

  if (authLoading || user?.role !== 'admin') {
    return null;
  }

  const nextStep = () => {
    if (step === 1) {
      if (!formData.username || !formData.email || !formData.password || !formData.role) {
        setError('Please fill in all account fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }
    setError(null);
    setStep(step + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const submitData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || undefined,
      };
      await registerApi.register(submitData);
      toast.success("Account created successfully! Redirecting..."); // Added this
      router.push('/auth/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      toast.error(msg); // Added this
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold font-heading tracking-tight text-white">Join Lendr</h1>
        <p className="text-zinc-400">Step {step} of 2: {step === 1 ? 'Account Setup' : 'Personal Details'}</p>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 rounded-t-3xl overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500" 
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">Username</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
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
                <label className="text-sm font-medium text-zinc-400 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="email"
                    required
                    className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 outline-none transition-all"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400 ml-1">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400 ml-1">Confirm</label>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="password"
                      required
                      className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 outline-none transition-all"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">System Role</label>
                <div className="relative group">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                  <select
                    className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-3 pl-12 pr-4 text-white outline-none transition-all appearance-none cursor-pointer"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value} className="bg-zinc-900">
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400 ml-1">First Name</label>
                  <div className="relative group">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="text"
                      required
                      className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 outline-none transition-all"
                      placeholder="John"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400 ml-1">Last Name</label>
                  <div className="relative group">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                      type="text"
                      required
                      className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 outline-none transition-all"
                      placeholder="Doe"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">Middle Name (Optional)</label>
                <div className="relative group">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 outline-none transition-all"
                    placeholder="Quincy"
                    value={formData.middle_name}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            {step === 2 && (
              <button
                type="button"
                onClick={prevStep}
                className="w-1/3 border border-zinc-800 text-zinc-400 font-bold py-4 rounded-2xl hover:bg-zinc-800 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            )}
            
            {step === 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-1 bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 group"
              >
                Next Step
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Complete Registration
                    <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
          <p className="text-zinc-400 text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-white font-semibold hover:text-indigo-400 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
