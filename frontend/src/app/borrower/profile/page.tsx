'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { auth, User } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading borrower profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Borrower Profile</h1>
        <p className="text-sm text-muted-foreground">
          View and edit your account profile details.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Profile Details</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Keep your borrower information up to date.
            </p>
          </div>
          {!isEditingProfile ? (
            <Button variant="outline" onClick={() => setIsEditingProfile(true)}>
              Edit profile
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleCancelProfileEdit}
                disabled={saveProfileMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending}>
                {saveProfileMutation.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="first_name"
              value={formData.first_name || ''}
              onChange={handleProfileInputChange}
              disabled={!isEditingProfile || saveProfileMutation.isPending}
            />
            <Input
              label="Last Name"
              name="last_name"
              value={formData.last_name || ''}
              onChange={handleProfileInputChange}
              disabled={!isEditingProfile || saveProfileMutation.isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Middle Name"
              name="middle_name"
              value={formData.middle_name || ''}
              onChange={handleProfileInputChange}
              disabled={!isEditingProfile || saveProfileMutation.isPending}
            />
            <Input
              label="Username"
              name="username"
              value={formData.username || ''}
              onChange={handleProfileInputChange}
              disabled={!isEditingProfile || saveProfileMutation.isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleProfileInputChange}
              disabled={!isEditingProfile || saveProfileMutation.isPending}
            />
            <Input
              label="Contact Number"
              name="contact_number"
              value={formData.contact_number || ''}
              onChange={handleProfileInputChange}
              disabled={!isEditingProfile || saveProfileMutation.isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="User ID" value={user.user_id} disabled />
            <Input label="Role" value={user.role} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Password</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Borrower password must be exactly 6 numeric digits.
            </p>
          </div>
          {!isEditingPassword ? (
            <Button variant="outline" onClick={() => setIsEditingPassword(true)}>
              Change password
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleCancelPasswordEdit}
                disabled={updatePasswordMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdatePassword} disabled={updatePasswordMutation.isPending}>
                {updatePasswordMutation.isPending ? 'Updating...' : 'Update password'}
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {isEditingPassword ? (
            <>
              <Input
                type="password"
                label="Current Password"
                name="current_password"
                value={passwordForm.current_password}
                onChange={handlePasswordInputChange}
                disabled={updatePasswordMutation.isPending}
              />
              <Input
                type="password"
                label="New Password (6 digits)"
                name="new_password"
                value={passwordForm.new_password}
                onChange={handlePasswordInputChange}
                disabled={updatePasswordMutation.isPending}
              />
              <Input
                type="password"
                label="Confirm New Password"
                name="confirm_password"
                value={passwordForm.confirm_password}
                onChange={handlePasswordInputChange}
                disabled={updatePasswordMutation.isPending}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Use the button above to update your password.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
