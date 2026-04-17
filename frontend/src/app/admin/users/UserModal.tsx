'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Mail, Shield, Clock, Hash, Phone, UserCircle, Check, ChevronDown, KeyRound, RotateCcwKey } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  userApi,
  User,
  UserCreate,
  UserUpdate,
  AuthConfig,
  UserTwoFactorStatus,
  UserTwoFactorEnrollmentInitiateResponse,
} from './api';
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
  const MIN_TWO_FACTOR_CODE_LENGTH = 6;
  const DEFAULT_PIN_LENGTH = 6;
  const SCHEMA_PASSWORD_MIN_LENGTH = 6;

  const [loading, setLoading] = useState(false);
  const [resettingTwoFactor, setResettingTwoFactor] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState<UserTwoFactorStatus | null>(null);
  const [twoFactorStatusLoading, setTwoFactorStatusLoading] = useState(false);
  const [retrievingRecoveryCredential, setRetrievingRecoveryCredential] = useState(false);
  const [resettingLoginPassword, setResettingLoginPassword] = useState(false);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [roles, setRoles] = useState<AuthConfig[]>([]);
  const [shifts, setShifts] = useState<AuthConfig[]>([]);
  const [pinLength, setPinLength] = useState(DEFAULT_PIN_LENGTH);
  
  const [isInitiatingTwoFactorEnrollment, setIsInitiatingTwoFactorEnrollment] = useState(false);
  const [isVerifyingTwoFactorEnrollment, setIsVerifyingTwoFactorEnrollment] = useState(false);
  const [twoFactorEnrollment, setTwoFactorEnrollment] = useState<UserTwoFactorEnrollmentInitiateResponse | null>(null);
  const [twoFactorEnrollmentCode, setTwoFactorEnrollmentCode] = useState('');

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
  const isTwoFactorEligibleUser = !isBorrowerRole;
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
      setTwoFactorStatusLoading(true);
      try {
        const response = await userApi.getTwoFactorStatus(user.user_id);
        setTwoFactorStatus(response.data);
      } catch {
        toast.error('Failed to load 2FA status');
      } finally {
        setTwoFactorStatusLoading(false);
      }
    };

    void fetchTwoFactorStatus();
  }, [isEdit, user]);

  const formatTwoFactorDate = (value: string | null) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date.toLocaleString();
  };

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
          username: effectiveUsername,
          ...(employeeId ? { employee_id: employeeId } : {}),
          ...(pin ? { password: pin } : {}),
        };
        await userApi.update(user!.user_id, updateData);
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

        const createPayload: UserCreate = {
          username: employeeId,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          shift_type: formData.shift_type,
          employee_id: employeeId,
          middle_name: toOptionalText(formData.middle_name),
          contact_number: toOptionalText(formData.contact_number),
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
      setTwoFactorStatus({ enabled: false, enrolled_at: null, method: 'authenticator_app' });
      toast.success('2FA reset successfully');
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset 2FA';
      toast.error(message);
    } finally {
      setResettingTwoFactor(false);
    }
  };

  const handleStartTwoFactorEnrollment = async () => {
    if (!user) return;
    setIsInitiatingTwoFactorEnrollment(true);
    try {
      const response = await userApi.initiateTwoFactorEnrollment(user.user_id);
      setTwoFactorEnrollment(response.data);
      setTwoFactorEnrollmentCode('');
      toast.info('Scan the QR code, then enter the authenticator code to complete setup.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to start 2FA setup';
      toast.error(message);
    } finally {
      setIsInitiatingTwoFactorEnrollment(false);
    }
  };

  const handleVerifyTwoFactorEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const code = twoFactorEnrollmentCode.trim();
    if (code.length < MIN_TWO_FACTOR_CODE_LENGTH) {
      toast.error('Enter a valid authenticator code.');
      return;
    }

    setIsVerifyingTwoFactorEnrollment(true);
    try {
      const response = await userApi.verifyTwoFactorEnrollment(user.user_id, code);
      setTwoFactorStatus(response.data);
      setTwoFactorEnrollment(null);
      setTwoFactorEnrollmentCode('');
      toast.success('Two-factor authentication enabled for user.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to verify 2FA setup';
      toast.error(message);
    } finally {
      setIsVerifyingTwoFactorEnrollment(false);
    }
  };

  const handleRetrieveSecondaryPassword = async () => {
    if (!user) return;
    if (isBorrowerRole) {
      toast.info(borrowerActionDisabledReason);
      return;
    }
    const confirmed = window.confirm(
      `Retrieve secondary password for ${user.first_name} ${user.last_name}? This reveal should only be done for verified identity requests.`,
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
      `Reset login password for ${user.first_name} ${user.last_name}? This will generate a new one-time password and rotate the secondary password.`,
    );
    if (!confirmed) return;

    const secondaryPassword = window.prompt(`Enter current secondary password for ${user.first_name} ${user.last_name}:`);
    if (!secondaryPassword?.trim()) {
      toast.error('Secondary password is required');
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

  const inputClassName = 'w-full h-11 px-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all';
  const inputWithIconClassName = 'w-full h-11 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all';

  const twoFactorStatusLabel = twoFactorStatusLoading ? 'Checking 2FA...' : twoFactorStatus?.enabled ? '2FA Enabled' : '2FA Disabled';
  const twoFactorStatusClassName = twoFactorStatus?.enabled ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-amber-500/10 text-amber-700 border-amber-500/20';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{isEdit ? 'Edit User' : 'Add New User'}</h2>
              {isEdit && (
                <div className={cn('inline-flex items-center mt-2 rounded-full border px-2.5 py-1 text-xs font-medium', twoFactorStatusClassName)}>
                  {twoFactorStatusLabel}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <section>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><UserCircle className="w-4 h-4 text-primary" />Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1.5">First Name *</label><input required name="first_name" value={formData.first_name} onChange={handleChange} className={inputClassName} /></div>
                <div><label className="block text-sm font-medium mb-1.5">Last Name *</label><input required name="last_name" value={formData.last_name} onChange={handleChange} className={inputClassName} /></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1.5">Middle Name</label><input name="middle_name" value={formData.middle_name} onChange={handleChange} className={inputClassName} /></div>
              </div>
            </section>

            <hr />

            <section>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />Account & Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1.5">Employee ID *</label><div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" /><input name="employee_id" value={formData.employee_id} onChange={handleChange} required={!isEdit} className={inputWithIconClassName} /></div></div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{isBorrowerRole ? 'PIN Code' : 'Password'}</label>
                  {isEdit || isBorrowerRole ? <input type="password" name="password" value={formData.password} onChange={handleChange} className={inputClassName} placeholder={isEdit ? 'Leave blank to keep current' : 'Enter PIN'} /> : <div className="h-11 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-sm text-amber-700 flex items-center">Auto-generated after creation</div>}
                </div>
                <div><label className="block text-sm font-medium mb-1.5">Email Address *</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" /><input required type="email" name="email" value={formData.email} onChange={handleChange} className={inputWithIconClassName} /></div></div>
                <div><label className="block text-sm font-medium mb-1.5">Contact Number</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" /><input name="contact_number" value={formData.contact_number} onChange={handleChange} className={inputWithIconClassName} /></div></div>
              </div>
            </section>

            {isEdit && (
              <>
                <hr />
                <section>
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-amber-500" />Security Actions</h3>
                  
                  <div className="space-y-3">
                    {/* 2FA Section */}
                    <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">Authenticator (2FA)</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {twoFactorStatus?.enabled ? `Enabled (Enrolled: ${formatTwoFactorDate(twoFactorStatus.enrolled_at)})` : 'Not configured'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {isTwoFactorEligibleUser && !twoFactorStatus?.enabled && !twoFactorEnrollment && (
                            <button type="button" onClick={handleStartTwoFactorEnrollment} disabled={isInitiatingTwoFactorEnrollment} className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 flex items-center gap-1.5">
                              {isInitiatingTwoFactorEnrollment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                              Setup 2FA
                            </button>
                          )}
                          {isTwoFactorEligibleUser && twoFactorStatus?.enabled && (
                            <button type="button" onClick={handleResetTwoFactor} disabled={resettingTwoFactor} className="text-xs font-medium bg-amber-500/10 text-amber-700 border border-amber-500/20 px-3 py-1.5 rounded-md hover:bg-amber-500/20 flex items-center gap-1.5">
                              {resettingTwoFactor ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
                              Reset 2FA
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2FA Enrollment UI */}
                      {twoFactorEnrollment && (
                         <div className="mt-4 pt-4 border-t border-border space-y-4">
                            <div className="flex justify-center bg-white p-3 rounded-lg w-fit mx-auto">
                              <QRCodeSVG value={twoFactorEnrollment.provisioning_uri} size={150} />
                            </div>
                            <div className="grid gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Secret Key</p>
                              <code className="bg-background border rounded px-3 py-2 text-xs font-mono break-all select-all">{twoFactorEnrollment.secret}</code>
                            </div>
                            <form onSubmit={handleVerifyTwoFactorEnrollment} className="flex gap-2">
                              <input 
                                placeholder="Enter 6-digit code"
                                value={twoFactorEnrollmentCode}
                                onChange={(e) => setTwoFactorEnrollmentCode(e.target.value)}
                                className="flex-1 bg-background border rounded px-3 h-9 text-sm"
                              />
                              <button type="submit" disabled={isVerifyingTwoFactorEnrollment} className="bg-primary text-primary-foreground px-4 rounded h-9 text-xs font-medium">
                                {isVerifyingTwoFactorEnrollment ? 'Verifying...' : 'Complete Setup'}
                              </button>
                              <button type="button" onClick={() => setTwoFactorEnrollment(null)} className="px-3 border rounded text-xs">Cancel</button>
                            </form>
                         </div>
                      )}
                    </div>

                    {/* Secondary Password & Reset Section */}
                    {!isBorrowerRole && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button type="button" onClick={handleRetrieveSecondaryPassword} disabled={retrievingRecoveryCredential} className="flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-700 text-xs font-medium hover:bg-blue-500/15">
                           {retrievingRecoveryCredential ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                           View Secondary Password
                        </button>
                        <button type="button" onClick={handleResetLoginPassword} disabled={resettingLoginPassword} className="flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 text-xs font-medium hover:bg-red-500/15">
                           {resettingLoginPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcwKey className="w-4 h-4" />}
                           Reset Login Password
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            <hr />

            <section>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />System Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormSelect label="Role" value={formData.role} onChange={(v) => setFormData(p => ({ ...p, role: v }))} options={roles.map(r => ({ key: r.key, label: r.value }))} triggerClassName="h-11" />
                <FormSelect label="Shift" value={formData.shift_type} onChange={(v) => setFormData(p => ({ ...p, shift_type: v }))} options={shifts.map(s => ({ key: s.key, label: s.value }))} triggerClassName="h-11" />
              </div>
            </section>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t bg-muted/20">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? 'Save Changes' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}