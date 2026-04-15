'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/lib/auth';
import { useBorrowerAccountUpdate } from '../lib/useBorrowerQueries';
import { sanitizePin, validatePinChangeInput } from '../lib/validation';

type AccountFormState = Partial<
  Pick<User, 'first_name' | 'last_name' | 'middle_name' | 'email' | 'contact_number'>
>;

type PinFormState = {
  currentPin: string;
  newPin: string;
  confirmPin: string;
};

const INITIAL_PIN_FORM: PinFormState = {
  currentPin: '',
  newPin: '',
  confirmPin: '',
};

export default function BorrowerAccountPage() {
  const { user, refreshUser } = useAuth();
  const updateAccountMutation = useBorrowerAccountUpdate();

  const [profileForm, setProfileForm] = useState<AccountFormState>({});
  const [pinForm, setPinForm] = useState<PinFormState>(INITIAL_PIN_FORM);

  useEffect(() => {
    if (!user) return;

    setProfileForm({
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name || '',
      email: user.email,
      contact_number: user.contact_number || '',
    });
  }, [user]);

  const isSaving = updateAccountMutation.isPending;

  const handleProfileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePinInputChange = (field: keyof PinFormState, value: string) => {
    setPinForm((prev) => ({
      ...prev,
      [field]: sanitizePin(value),
    }));
  };

  const handleSaveProfile = async () => {
    try {
      await updateAccountMutation.mutateAsync(profileForm);
      await refreshUser();
      toast.success('Account details updated.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update account details';
      toast.error(message);
    }
  };

  const handleChangePin = async () => {
    const pinValidationError = validatePinChangeInput(pinForm);
    if (pinValidationError) {
      toast.error(pinValidationError);
      return;
    }

    try {
      await updateAccountMutation.mutateAsync({
        current_password: pinForm.currentPin,
        password: pinForm.newPin,
      });
      setPinForm(INITIAL_PIN_FORM);
      toast.success('PIN updated successfully.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update PIN';
      toast.error(message);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold font-heading">Account</h1>
        <p className="text-sm text-muted-foreground">
          Update your borrower profile details and PIN.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="First Name"
              name="first_name"
              value={profileForm.first_name || ''}
              onChange={handleProfileChange}
            />
            <Input
              label="Last Name"
              name="last_name"
              value={profileForm.last_name || ''}
              onChange={handleProfileChange}
            />
          </div>
          <Input
            label="Middle Name"
            name="middle_name"
            value={profileForm.middle_name || ''}
            onChange={handleProfileChange}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Email"
              name="email"
              value={profileForm.email || ''}
              onChange={handleProfileChange}
            />
            <Input
              label="Contact Number"
              name="contact_number"
              value={profileForm.contact_number || ''}
              onChange={handleProfileChange}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void handleSaveProfile()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Details'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change PIN</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              label="Current PIN"
              value={pinForm.currentPin}
              onChange={(event) => handlePinInputChange('currentPin', event.target.value)}
              maxLength={6}
              placeholder="6 digits"
            />
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              label="New PIN"
              value={pinForm.newPin}
              onChange={(event) => handlePinInputChange('newPin', event.target.value)}
              maxLength={6}
              placeholder="6 digits"
            />
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              label="Confirm New PIN"
              value={pinForm.confirmPin}
              onChange={(event) => handlePinInputChange('confirmPin', event.target.value)}
              maxLength={6}
              placeholder="6 digits"
            />
          </div>

          <p className="text-xs text-muted-foreground">PIN must be digits only and exactly 6 characters.</p>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => void handleChangePin()} disabled={isSaving}>
              {isSaving ? 'Updating...' : 'Update PIN'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
