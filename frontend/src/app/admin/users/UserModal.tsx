'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Mail, Shield, Clock, Hash, Phone, UserCircle, KeyRound, RotateCcwKey } from 'lucide-react';
import { userApi, User, UserCreate, UserUpdate, AuthConfig } from './api';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { FormSelect } from '@/components/ui/form-select';
import { cn } from '@/lib/utils';
import type { UserCredentialReveal } from './lib/types';

interface UserModalProps {
  user?: User;
  onClose: () => void;
  onSuccess: () => void;
  onCredentialReveal: (payload: UserCredentialReveal) => void;
  onRefetchUsers?: () => void;
}

type EditableUserUpdate = UserUpdate & {
  employee_id?: string;
  password?: string;
};

export function UserModal({
  user,
  onClose,
  onSuccess,
  onCredentialReveal,
  onRefetchUsers,
}: UserModalProps) {
  const isEdit = !!user;
  const DEFAULT_PIN_LENGTH = 6;
  const SCHEMA_PASSWORD_MIN_LENGTH = 6;
  const [loading, setLoading] = useState(false);
  const [resettingTwoFactor, setResettingTwoFactor] = useState(false);
  const [loadingTwoFactorStatus, setLoadingTwoFactorStatus] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState<{ enabled: boolean; enrolled_at: string | null } | null>(null);
  const [retrievingRecoveryCredential, setRetrievingRecoveryCredential] = useState(false);
  const [resettingLoginPassword, setResettingLoginPassword] = useState(false);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [roles, setRoles] = useState<AuthConfig[]>([]);
  const [shifts, setShifts] = useState<AuthConfig[]>([]);
  const [pinLength, setPinLength] = useState(DEFAULT_PIN_LENGTH);


  const pinValidationMessage = `PIN must be at least ${pinLength} characters`;
  const BORROWER_ROLE_KEYS = new Set(['borrower', 'brwr']);
  const PASSWORD_POLICY_EXEMPT_ROLES = new Set(['borrower', 'brwr', 'dispatch']);

  const normalizeRole = (role: string | undefined): string => (role || '').trim().toLowerCase();

  const isBorrowerRoleKey = (role: string | undefined): boolean =>
    BORROWER_ROLE_KEYS.has(normalizeRole(role));

  const isRolePasswordPolicyExempt = (role: string | undefined): boolean =>
    PASSWORD_POLICY_EXEMPT_ROLES.has(normalizeRole(role));

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    middle_name: user?.middle_name || '',
    contact_number: user?.contact_number || '',
    employee_id: user?.employee_id || '',
    role: user?.role || '',
    shift_type: user?.shift_type || 'day',
  });

  const isBorrowerRole = isBorrowerRoleKey(formData.role || user?.role);
  const borrowerActionDisabledReason =
    'Unavailable for borrower accounts because this role uses borrower PIN login flows.';

  useEffect(() => {
    const normalizePinLength = (value: unknown): number => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 1) {
        return DEFAULT_PIN_LENGTH;
      }
      return Math.trunc(parsed);
    };

    const fetchConfigs = async () => {
      try {
        const [rolesRes, shiftsRes, securityRes] = await Promise.allSettled([
          userApi.getConfigs('users_role'),
          userApi.getConfigs('users_shift_type'),
          userApi.getSecuritySettings(),
        ]);

        if (rolesRes.status !== 'fulfilled' || shiftsRes.status !== 'fulfilled') {
          toast.error('Failed to load roles and shift types');
          return;
        }

        setRoles(rolesRes.value.data);
        setShifts(shiftsRes.value.data);

        if (securityRes.status === 'fulfilled') {
          setPinLength(normalizePinLength(securityRes.value.data?.password_rules?.min_length));
        }

        if (!isEdit && rolesRes.value.data.length > 0) {
          setFormData((prev) =>
            prev.role ? prev : { ...prev, role: rolesRes.value.data[0].key }
          );
        }
      } catch {
        toast.error('Failed to load user form settings');
      } finally {
        setConfigsLoading(false);
      }
    };
    fetchConfigs();
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || !user) {
      setTwoFactorStatus(null);
      return;
    }

    const fetchTwoFactorStatus = async () => {
      setLoadingTwoFactorStatus(true);
      try {
        const result = await userApi.getTwoFactorStatus(user.user_id);
        setTwoFactorStatus({
          enabled: result.data.enabled,
          enrolled_at: result.data.enrolled_at,
        });
      } catch {
        toast.error('Failed to load 2FA status');
      } finally {
        setLoadingTwoFactorStatus(false);
      }
    };

    void fetchTwoFactorStatus();
  }, [isEdit, user]);

  const toOptionalText = (value: string): string | undefined => {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const employeeId = (formData.employee_id || '').trim();
      const pin = (formData.password || '').trim();
      const effectiveRole = formData.role || user?.role;
      const enforcePasswordRules = !isRolePasswordPolicyExempt(effectiveRole);

      const effectiveUsername = employeeId || (formData.username || '').trim();

      if (isEdit) {
        if (pin && pin.length < SCHEMA_PASSWORD_MIN_LENGTH) {
          toast.error(`PIN must be at least ${SCHEMA_PASSWORD_MIN_LENGTH} characters`);
          return;
        }

        if (enforcePasswordRules && pin && pin.length < pinLength) {
          toast.error(pinValidationMessage);
          return;
        }

        const { password: _ignoredPassword, ...formDataWithoutPassword } = formData;
        const updateData: EditableUserUpdate = {
          ...formDataWithoutPassword,
          username: employeeId || effectiveUsername,
          ...(employeeId ? { employee_id: employeeId } : {}),
          ...(pin ? { password: pin } : {}),
        };
        await userApi.update(user.user_id, updateData);
        toast.success('User updated successfully');
      } else {
        if (!employeeId) {
          toast.error('Employee ID is required');
          return;
        }

        if (isBorrowerRole) {
          if (!pin) {
            toast.error('PIN is required for borrower accounts');
            return;
          }

          if (pin.length < SCHEMA_PASSWORD_MIN_LENGTH) {
            toast.error(`PIN must be at least ${SCHEMA_PASSWORD_MIN_LENGTH} characters`);
            return;
          }

          if (enforcePasswordRules && pin.length < pinLength) {
            toast.error(pinValidationMessage);
            return;
          }
        }

        const middleName = toOptionalText(formData.middle_name);
        const contactNumber = toOptionalText(formData.contact_number);

        const createPayload: UserCreate = {
          username: employeeId,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          shift_type: formData.shift_type,
          employee_id: employeeId,
          ...(middleName ? { middle_name: middleName } : {}),
          ...(contactNumber ? { contact_number: contactNumber } : {}),
          ...(isBorrowerRole ? { password: pin } : {}),
        };

        const created = await userApi.register(createPayload);

        if (created.data.generated_credentials) {
          onCredentialReveal({
            source: 'create',
            userId: created.data.user.user_id,
            userName: `${created.data.user.first_name} ${created.data.user.last_name}`,
            oneTimeLoginPassword: created.data.generated_credentials.one_time_login_password,
            secondaryPassword: created.data.generated_credentials.secondary_password ?? undefined,
          });
        }

        toast.success('User registered successfully');
      }
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save user';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetTwoFactor = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      `Reset 2FA for ${user.first_name} ${user.last_name}? Their authenticator enrollment will be removed and active sessions will be revoked.`,
    );
    if (!confirmed) return;

    setResettingTwoFactor(true);
    try {
      await userApi.resetTwoFactor(user.user_id);
      setTwoFactorStatus({ enabled: false, enrolled_at: null });
      toast.success('2FA reset successfully');
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset 2FA';
      toast.error(message);
    } finally {
      setResettingTwoFactor(false);
    }
  };

  const handleRetrieveSecondaryPassword = async () => {
    if (!user) return;

    if (isBorrowerRole) {
      toast.info(borrowerActionDisabledReason);
      return;
    }

    const confirmed = window.confirm(
      `Retrieve secondary password for ${user.first_name} ${user.last_name}? This action is privileged and should only be done for verified identity requests. This reveals the current secondary password without rotating it.`,
    );
    if (!confirmed) return;

    setRetrievingRecoveryCredential(true);
    try {
      const result = await userApi.getSecondaryPassword(user.user_id);
      onCredentialReveal({
        source: 'secondary_password',
        userId: result.data.user_id,
        userName: `${user.first_name} ${user.last_name}`,
        secondaryPassword: result.data.secondary_password,
        rotatedAt: result.data.rotated_at,
      });
      toast.success('Secondary password retrieved');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve secondary password';
      toast.error(message);
    } finally {
      setRetrievingRecoveryCredential(false);
    }
  };

  const handleResetLoginPassword = async () => {
    if (!user) return;

    if (isBorrowerRole) {
      toast.info(borrowerActionDisabledReason);
      return;
    }

    const confirmed = window.confirm(
      `Reset login password for ${user.first_name} ${user.last_name}? Current sessions will be revoked and a new one-time password will be generated. This requires the current secondary password and rotates it after successful reset.`,
    );
    if (!confirmed) return;

    const secondaryPassword = window.prompt(
      `Enter the current secondary password for ${user.first_name} ${user.last_name} to continue:`,
    );
    if (!secondaryPassword?.trim()) {
      toast.error('Secondary password is required to reset login password');
      return;
    }

    setResettingLoginPassword(true);
    try {
      const result = await userApi.resetLoginPassword(user.user_id, {
        secondary_password: secondaryPassword.trim(),
      });
      onCredentialReveal({
        source: 'reset_login_password',
        userId: result.data.user_id,
        userName: `${user.first_name} ${user.last_name}`,
        oneTimeLoginPassword: result.data.generated_credentials.one_time_login_password,
        secondaryPassword: result.data.generated_credentials.secondary_password ?? undefined,
      });
      onRefetchUsers?.();
      toast.success('Login password reset successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset login password';
      toast.error(message);
    } finally {
      setResettingLoginPassword(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const inputClassName =
    'w-full h-11 px-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40';

  const inputWithIconClassName =
    'w-full h-11 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40';

  const twoFactorStatusLabel = loadingTwoFactorStatus
    ? 'Checking 2FA status...'
    : twoFactorStatus?.enabled
      ? '2FA Enabled'
      : '2FA Not Enabled';

  const twoFactorStatusClassName = loadingTwoFactorStatus
    ? 'bg-muted text-muted-foreground border-border'
    : twoFactorStatus?.enabled
      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
      : 'bg-amber-500/10 text-amber-700 border-amber-500/20';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-xl bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {isEdit ? 'Edit User' : 'Add New User'}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isEdit
                  ? `Updating ${user.first_name} ${user.last_name}'s profile`
                  : 'Fill in the details to create a new user account'}
              </p>
              {isEdit && (
                <div
                  className={cn(
                    'inline-flex items-center mt-2 rounded-full border px-2.5 py-1 text-xs font-medium',
                    twoFactorStatusClassName,
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {twoFactorStatusLabel}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close user modal"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Personal Information */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-primary" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="e.g. Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="e.g. Dela Cruz"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Middle Name <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="e.g. Santos"
                  />
                </div>
              </div>
            </section>

            <hr className="border-border" />

            {/* Account & Contact */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Account & Contact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Employee ID <span className="text-red-400">{!isEdit ? '*' : ''}</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                    <input
                      name="employee_id"
                      value={formData.employee_id}
                      onChange={handleChange}
                      required={!isEdit}
                      className={inputWithIconClassName}
                      placeholder="e.g. EMP-001"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {isBorrowerRole ? 'PIN Code' : 'Password'}{' '}
                    <span className="text-red-400">{!isEdit && isBorrowerRole ? '*' : ''}</span>
                    {isEdit && (
                      <span className="text-muted-foreground font-normal text-xs ml-1">(leave blank to keep current)</span>
                    )}
                  </label>
                  {isEdit || isBorrowerRole ? (
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={inputClassName}
                      placeholder={isBorrowerRole ? 'Enter PIN' : 'Enter new password'}
                    />
                  ) : (
                    <div className="h-11 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-sm text-amber-700 flex items-center">
                      One-time login password will be generated automatically after user creation.
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                    <input
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={inputWithIconClassName}
                      placeholder="e.g. juan@company.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Contact Number <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                    <input
                      name="contact_number"
                      value={formData.contact_number}
                      onChange={handleChange}
                      className={inputWithIconClassName}
                      placeholder="e.g. 09123456789"
                    />
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-border" />

            {isEdit && (
              <>
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    2FA Security
                  </h3>
                  <div className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Authenticator reset</p>
                      <p className="text-xs text-muted-foreground">
                        Status:{' '}
                        {loadingTwoFactorStatus
                          ? 'Checking...'
                          : twoFactorStatus?.enabled
                            ? 'Enabled'
                            : 'Not enabled'}
                      </p>
                      {!loadingTwoFactorStatus && twoFactorStatus?.enrolled_at && (
                        <p className="text-xs text-muted-foreground">
                          Enrolled at: {new Date(twoFactorStatus.enrolled_at).toLocaleString()}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Use this if the user lost their authenticator device. The current 2FA enrollment will be removed and they will sign in without 2FA until they enroll again.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetTwoFactor}
                      disabled={resettingTwoFactor || loading}
                      className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 disabled:opacity-50 transition-colors shrink-0"
                    >
                      {resettingTwoFactor ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          Reset 2FA
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mt-3">
                    <div className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Retrieve secondary password</p>
                        <p className="text-sm text-muted-foreground">
                          Use this for verified account recovery requests. This reveals the current secondary password without rotating it, and the revealed value should be shared only through an approved secure channel.
                        </p>
                        {isBorrowerRole && (
                          <p className="text-xs font-medium text-amber-700" role="status">
                            {borrowerActionDisabledReason}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleRetrieveSecondaryPassword}
                        disabled={isBorrowerRole || retrievingRecoveryCredential || loading}
                        className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 disabled:opacity-50 transition-colors shrink-0"
                      >
                        {retrievingRecoveryCredential ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Retrieving...
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-4 h-4" />
                            View Secondary Password
                          </>
                        )}
                      </button>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Reset login password</p>
                        <p className="text-sm text-muted-foreground">
                          Generates a new one-time login password and revokes active sessions. The user must rotate this password on next login.
                        </p>
                        {isBorrowerRole && (
                          <p className="text-xs font-medium text-amber-700" role="status">
                            {borrowerActionDisabledReason}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleResetLoginPassword}
                        disabled={isBorrowerRole || resettingLoginPassword || loading}
                        className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/15 disabled:opacity-50 transition-colors shrink-0"
                      >
                        {resettingLoginPassword ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          <>
                            <RotateCcwKey className="w-4 h-4" />
                            Reset Login Password
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </section>

                <hr className="border-border" />
              </>
            )}

            {/* System Configuration */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                System Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Shield className="absolute left-3 top-[38px] w-4 h-4 text-muted-foreground/50 pointer-events-none z-10" />
                  <FormSelect
                    label="Role"
                    required
                    disabled={configsLoading}
                    value={formData.role}
                    onChange={(v) => setFormData(prev => ({ ...prev, role: v }))}
                    options={roles.map(r => ({ key: r.key, label: `${r.value} (${r.key})` }))}
                    placeholder="Select a role..."
                    triggerClassName="pl-10 h-11"
                  />
                  {configsLoading && <Loader2 className="absolute right-3 top-[38px] w-4 h-4 animate-spin text-muted-foreground z-10" />}
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-[38px] w-4 h-4 text-muted-foreground/50 pointer-events-none z-10" />
                  <FormSelect
                    label="Shift"
                    required
                    disabled={configsLoading}
                    value={formData.shift_type}
                    onChange={(v) => setFormData(prev => ({ ...prev, shift_type: v }))}
                    options={shifts.map(s => ({ key: s.key, label: s.value }))}
                    placeholder="Select a shift..."
                    triggerClassName="pl-10 h-11"
                  />
                  {configsLoading && <Loader2 className="absolute right-3 top-[38px] w-4 h-4 animate-spin text-muted-foreground z-10" />}
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-muted/20">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || configsLoading}
              className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}