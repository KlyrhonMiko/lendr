'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  Loader2,
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Edit3,
  Save,
  X,
  Key,
  Smartphone,
  AtSign,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { auth, User } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn, formatDate } from '@/lib/utils';

const BORROWER_ROLES = new Set(['borrower', 'brwr']);
const BORROWER_PASSWORD_PATTERN = /^\d{6}$/;
const BORROWER_PASSWORD_RULE_MESSAGE = 'Borrower password must be exactly 6 digits.';
const PROFILE_EDITABLE_FIELDS = [
  'first_name',
  'last_name',
  'middle_name',
  'email',
  'contact_number',
  'username',
] as const;

type EditableProfileField = (typeof PROFILE_EDITABLE_FIELDS)[number];

function normalizeRole(role: string | undefined): string {
  return (role || '').trim().toLowerCase();
}

function toProfilePayload(formData: Partial<User>): Partial<Pick<User, EditableProfileField>> {
  const payload: Partial<Pick<User, EditableProfileField>> = {};

  for (const field of PROFILE_EDITABLE_FIELDS) {
    const value = formData[field];
    if (typeof value !== 'string') {
      continue;
    }

    if (field === 'middle_name') {
      payload[field] = value.trim();
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) {
      payload[field] = trimmed;
    }
  }

  return payload;
}

export default function BorrowerProfilePage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const isBorrower = BORROWER_ROLES.has(normalizeRole(user?.role));

  useEffect(() => {
    if (!loading && user && !isBorrower) {
      router.replace(auth.getRedirectPath(user.role));
    }
  }, [isBorrower, loading, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name || '',
      email: user.email,
      contact_number: user.contact_number || '',
      username: user.username,
    });
  }, [user]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const payload = toProfilePayload(formData);
      if (Object.keys(payload).length === 0) {
        return null;
      }

      return auth.updateMe(payload);
    },
    onSuccess: async () => {
      await refreshUser();
      setIsEditingProfile(false);
      toast.success('Profile updated successfully.');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update profile.';
      toast.error(message);
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async () =>
      auth.updateMe({
        current_password: passwordForm.current_password,
        password: passwordForm.new_password,
      }),
    onSuccess: async () => {
      await refreshUser();
      setIsEditingPassword(false);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      toast.success('Password updated successfully.');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update password.';
      toast.error(message);
    },
  });

  const handleProfileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancelProfileEdit = () => {
    if (user) {
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        middle_name: user.middle_name || '',
        email: user.email,
        contact_number: user.contact_number || '',
        username: user.username,
      });
    }
    setIsEditingProfile(false);
  };

  const handlePasswordInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancelPasswordEdit = () => {
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setIsEditingPassword(false);
  };

  const handleUpdatePassword = () => {
    if (!passwordForm.current_password.trim()) {
      toast.error('Current password is required.');
      return;
    }

    if (!BORROWER_PASSWORD_PATTERN.test(passwordForm.new_password)) {
      toast.error(BORROWER_PASSWORD_RULE_MESSAGE);
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    if (passwordForm.current_password === passwordForm.new_password) {
      toast.error('New password must be different from current password.');
      return;
    }

    updatePasswordMutation.mutate();
  };

  if (loading || !user || !isBorrower) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/50">
        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
          </div>
          <span className="text-sm font-semibold text-muted-foreground tracking-wide">Syncing profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1 md:px-0">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="relative group shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-lg shadow-primary/5 transition-transform duration-300 group-hover:scale-105">
              <UserIcon className="w-8 h-8 md:w-10 md:h-10 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 md:w-7 md:h-7 rounded-lg bg-background border border-border flex items-center justify-center shadow-md">
              <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <h1 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground truncate">
                {user.first_name} {user.last_name}
              </h1>
              <span className="px-2 py-0.5 md:px-2.5 md:py-1 rounded-full bg-primary/10 text-primary text-[9px] md:text-[10px] font-bold uppercase tracking-widest border border-primary/20">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {!isEditingProfile ? (
          <Button
            variant="outline"
            onClick={() => setIsEditingProfile(true)}
            className="rounded-xl border-border/80 hover:bg-muted transition-all h-11 px-6 shadow-sm gap-2 w-full md:w-auto"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex items-center gap-3 animate-in slide-in-from-right-4 w-full md:w-auto">
            <Button
              variant="ghost"
              onClick={handleCancelProfileEdit}
              disabled={saveProfileMutation.isPending}
              className="rounded-xl h-11 px-6 flex-1 md:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveProfileMutation.mutate()}
              disabled={saveProfileMutation.isPending}
              className="rounded-xl h-11 px-8 shadow-md shadow-primary/20 gap-2 flex-1 md:flex-none"
            >
              {saveProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-3xl border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-4 px-4 md:px-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 transition-colors">
                  <UserIcon className="w-3.5 h-3.5 text-primary" />
                </div>
                <CardTitle className="text-[11px] md:text-sm font-bold uppercase tracking-widest">Personal Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">First Name</label>
                  <Input
                    name="first_name"
                    value={formData.first_name || ''}
                    onChange={handleProfileInputChange}
                    disabled={!isEditingProfile || saveProfileMutation.isPending}
                    className="rounded-xl h-11 bg-muted/20 border-border/60 focus:bg-background transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Last Name</label>
                  <Input
                    name="last_name"
                    value={formData.last_name || ''}
                    onChange={handleProfileInputChange}
                    disabled={!isEditingProfile || saveProfileMutation.isPending}
                    className="rounded-xl h-11 bg-muted/20 border-border/60 focus:bg-background transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Middle Name</label>
                  <Input
                    name="middle_name"
                    value={formData.middle_name || ''}
                    onChange={handleProfileInputChange}
                    disabled={!isEditingProfile || saveProfileMutation.isPending}
                    className="rounded-xl h-11 bg-muted/20 border-border/60 focus:bg-background transition-all"
                    placeholder="None"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Username</label>
                  <div className="relative">
                    <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground opacity-60" />
                    <Input
                      name="username"
                      value={formData.username || ''}
                      onChange={handleProfileInputChange}
                      disabled={!isEditingProfile || saveProfileMutation.isPending}
                      className="rounded-xl h-11 pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> Email Address
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleProfileInputChange}
                    disabled={!isEditingProfile || saveProfileMutation.isPending}
                    className="rounded-xl h-11 bg-muted/20 border-border/60 focus:bg-background transition-all tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> Contact Number
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground opacity-60" />
                    <Input
                      name="contact_number"
                      value={formData.contact_number || ''}
                      onChange={handleProfileInputChange}
                      disabled={!isEditingProfile || saveProfileMutation.isPending}
                      className="rounded-xl h-11 pl-9 bg-muted/20 border-border/60 focus:bg-background transition-all tabular-nums"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-4 px-4 md:px-6 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-500/10 transition-colors">
                  <Key className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <CardTitle className="text-[11px] md:text-sm font-bold uppercase tracking-widest">Security & PIN</CardTitle>
              </div>
              {!isEditingPassword ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingPassword(true)}
                  className="rounded-lg h-9 border-border/80 px-4 text-xs font-bold"
                >
                  Change Password
                </Button>
              ) : (
                <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelPasswordEdit}
                    disabled={updatePasswordMutation.isPending}
                    className="rounded-lg h-9 text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdatePassword}
                    disabled={updatePasswordMutation.isPending}
                    className="rounded-lg h-9 bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20 text-xs font-bold gap-2"
                  >
                    {updatePasswordMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Update
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              {isEditingPassword ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Current Password</label>
                    <Input
                      type="password"
                      name="current_password"
                      value={passwordForm.current_password}
                      onChange={handlePasswordInputChange}
                      disabled={updatePasswordMutation.isPending}
                      className="rounded-xl h-10 bg-muted/10 border-border/60 focus:bg-background transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">New Password</label>
                    <Input
                      type="password"
                      name="new_password"
                      placeholder="6 digits"
                      value={passwordForm.new_password}
                      onChange={handlePasswordInputChange}
                      disabled={updatePasswordMutation.isPending}
                      className="rounded-xl h-10 bg-muted/10 border-border/60 focus:bg-background transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Confirm New</label>
                    <Input
                      type="password"
                      name="confirm_password"
                      value={passwordForm.confirm_password}
                      onChange={handlePasswordInputChange}
                      disabled={updatePasswordMutation.isPending}
                      className="rounded-xl h-10 bg-muted/10 border-border/60 focus:bg-background transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 py-2">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-orange-600/60" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground tracking-tight">Your password is active</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Borrower accounts require a unique 6-digit numeric passcode. <br />
                      Last updated {user.password_rotated_at ? new Date().toLocaleDateString() : 'recently'}.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="rounded-3xl border-border/60 shadow-sm overflow-hidden bg-gradient-to-b from-card to-muted/10">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-4 px-4 md:px-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                </div>
                <CardTitle className="text-[11px] md:text-sm font-bold uppercase tracking-widest">Account Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between group">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identity Verified</p>
                  <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-500/20">
                    <UserCheck className="w-3 h-3" />
                    ACTIVE
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Privilege Level</p>
                  <p className="text-xs font-bold text-foreground">BORROWER</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">System Access</p>
                  <p className="text-xs font-bold text-foreground">INVENTORY</p>
                </div>
              </div>

              <div className="pt-6 border-t border-border/60">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Login Security</h5>
                <div className="p-3.5 rounded-xl bg-orange-500/5 border border-orange-500/10 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 mt-0.5 animate-pulse" />
                    <div>
                      <p className="text-[11px] font-bold text-foreground leading-tight">PIN Protection Active</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Physical terminal access requires PIN.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-6 rounded-3xl border border-dashed border-border/60 bg-muted/5">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 text-center">Need Assistance?</h5>
            <p className="text-center text-[11px] text-muted-foreground leading-relaxed px-4">
              If you encounter any issues with your borrower account, please contact the inventory administrator.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-4 text-[11px] font-bold uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
