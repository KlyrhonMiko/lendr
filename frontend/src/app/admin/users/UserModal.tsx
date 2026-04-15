'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Mail, Shield, Clock, Hash, Phone, UserCircle, Check, ChevronDown, KeyRound } from 'lucide-react';
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

interface UserModalProps {
  user?: User;
  onClose: () => void;
  onSuccess: () => void;
}

type EditableUserUpdate = UserUpdate & {
  employee_id?: string;
  password?: string;
};

export function UserModal({ user, onClose, onSuccess }: UserModalProps) {
  const isEdit = !!user;
  const MIN_TWO_FACTOR_CODE_LENGTH = 6;
  const DEFAULT_PIN_LENGTH = 6;
  const SCHEMA_PASSWORD_MIN_LENGTH = 6;
  const [loading, setLoading] = useState(false);
  const [resettingTwoFactor, setResettingTwoFactor] = useState(false);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [roles, setRoles] = useState<AuthConfig[]>([]);
  const [shifts, setShifts] = useState<AuthConfig[]>([]);
  const [pinLength, setPinLength] = useState(DEFAULT_PIN_LENGTH);
  const [twoFactorStatus, setTwoFactorStatus] = useState<UserTwoFactorStatus | null>(null);
  const [twoFactorStatusLoading, setTwoFactorStatusLoading] = useState(false);
  const [isInitiatingTwoFactorEnrollment, setIsInitiatingTwoFactorEnrollment] = useState(false);
  const [isVerifyingTwoFactorEnrollment, setIsVerifyingTwoFactorEnrollment] = useState(false);
  const [twoFactorEnrollment, setTwoFactorEnrollment] = useState<UserTwoFactorEnrollmentInitiateResponse | null>(null);
  const [twoFactorEnrollmentCode, setTwoFactorEnrollmentCode] = useState('');


  const pinValidationMessage = `PIN must be at least ${pinLength} characters`;
  const PASSWORD_POLICY_EXEMPT_ROLES = new Set(['borrower', 'dispatch']);

  const normalizeRole = (role: string | undefined): string => (role || '').trim().toLowerCase();
  const isBorrowerRole = (role: string | undefined): boolean => {
    const normalized = normalizeRole(role);
    return normalized === 'borrower' || normalized === 'brwr';
  };

  const isRolePasswordPolicyExempt = (role: string | undefined): boolean =>
    PASSWORD_POLICY_EXEMPT_ROLES.has(normalizeRole(role));

  const isTwoFactorEligibleUser = !isBorrowerRole(user?.role);

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
      return;
    }

    const fetchTwoFactorStatus = async () => {
      setTwoFactorStatusLoading(true);
      try {
        const response = await userApi.getTwoFactorStatus(user.user_id);
        setTwoFactorStatus(response.data);
        if (response.data.enabled) {
          setTwoFactorEnrollment(null);
          setTwoFactorEnrollmentCode('');
        }
      } catch {
        toast.error('Failed to load 2FA status');
      } finally {
        setTwoFactorStatusLoading(false);
      }
    };

    void fetchTwoFactorStatus();
  }, [isEdit, user]);

  const formatTwoFactorDate = (value: string | null) => {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
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
        const updateData: EditableUserUpdate = {
          ...formData,
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
        if (!pin) {
          toast.error('PIN is required');
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

        const createPayload: UserCreate = {
          ...(formData as Omit<UserCreate, 'username'>),
          username: employeeId,
          employee_id: employeeId,
        };

        await userApi.register(createPayload);
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
    if (!user) {
      return;
    }

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

    if (!user) {
      return;
    }

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

  const handleCancelTwoFactorEnrollment = () => {
    setTwoFactorEnrollment(null);
    setTwoFactorEnrollmentCode('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const inputClassName =
    'w-full h-11 px-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40';

  const inputWithIconClassName =
    'w-full h-11 pl-10 pr-4 rounded-lg bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40';

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
                    PIN Code <span className="text-red-400">{!isEdit ? '*' : ''}</span>
                    {isEdit && (
                      <span className="text-muted-foreground font-normal text-xs ml-1">(leave blank to keep current)</span>
                    )}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="Enter PIN"
                  />
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
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                      <p className="text-sm font-medium text-foreground">Current status</p>
                      {twoFactorStatusLoading ? (
                        <p className="text-sm text-muted-foreground mt-1">Loading 2FA status...</p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          {twoFactorStatus?.enabled ? 'Enabled' : 'Disabled'}
                          {twoFactorStatus?.enabled
                            ? ` • Method: ${twoFactorStatus.method} • Enrolled: ${formatTwoFactorDate(twoFactorStatus.enrolled_at)}`
                            : ''}
                        </p>
                      )}
                    </div>

                    {!isTwoFactorEligibleUser && (
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <p className="text-sm font-medium text-foreground">2FA setup excluded</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Borrower users are excluded from admin-assisted 2FA setup.
                        </p>
                      </div>
                    )}

                    {isTwoFactorEligibleUser && !twoFactorStatus?.enabled && !twoFactorEnrollment && (
                      <div className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">Admin-assisted setup</p>
                          <p className="text-sm text-muted-foreground">
                            Generate a QR and secret for this user, then verify using their authenticator code.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleStartTwoFactorEnrollment}
                          disabled={isInitiatingTwoFactorEnrollment || loading}
                          className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-50 transition-colors shrink-0"
                        >
                          {isInitiatingTwoFactorEnrollment ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Starting...
                            </>
                          ) : (
                            'Set up 2FA'
                          )}
                        </button>
                      </div>
                    )}

                    {isTwoFactorEligibleUser && twoFactorEnrollment && (
                      <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Scan QR code</p>
                          <div className="flex justify-center">
                            <div className="rounded-lg bg-white p-2">
                              <QRCodeSVG
                                value={twoFactorEnrollment.provisioning_uri}
                                size={160}
                                bgColor="#FFFFFF"
                                fgColor="#111827"
                                level="M"
                                includeMargin
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="admin-two-factor-secret" className="text-sm font-medium text-foreground">
                            Secret key
                          </label>
                          <input
                            id="admin-two-factor-secret"
                            type="text"
                            readOnly
                            value={twoFactorEnrollment.secret}
                            onFocus={(e) => e.currentTarget.select()}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono text-foreground outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="admin-two-factor-uri" className="text-sm font-medium text-foreground">
                            Provisioning URI
                          </label>
                          <textarea
                            id="admin-two-factor-uri"
                            readOnly
                            value={twoFactorEnrollment.provisioning_uri}
                            rows={3}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none"
                          />
                        </div>

                        <form onSubmit={handleVerifyTwoFactorEnrollment} className="space-y-3">
                          <div className="space-y-1.5">
                            <label htmlFor="admin-two-factor-code" className="text-sm font-medium text-foreground">
                              Authenticator code
                            </label>
                            <input
                              id="admin-two-factor-code"
                              type="text"
                              required
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              minLength={MIN_TWO_FACTOR_CODE_LENGTH}
                              maxLength={12}
                              value={twoFactorEnrollmentCode}
                              onChange={(e) => setTwoFactorEnrollmentCode(e.target.value)}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-[3px] focus:ring-primary/10"
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleCancelTwoFactorEnrollment}
                              disabled={isVerifyingTwoFactorEnrollment}
                              className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isVerifyingTwoFactorEnrollment}
                              className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm"
                            >
                              {isVerifyingTwoFactorEnrollment ? 'Verifying...' : 'Verify 2FA'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {isTwoFactorEligibleUser && (
                      <div className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">Authenticator reset</p>
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
                    )}
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