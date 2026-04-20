'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/AuthContext';
import { auth, User } from '@/lib/auth';
import { api, AuthApiError, TwoFactorEnrollmentInitiateResponse } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    User as UserIcon,
    Mail,
    Phone,
    Edit3,
    Save,
    X,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

const MIN_TWO_FACTOR_CODE_LENGTH = 6;

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<User>>({});
    const [twoFactorEnrollment, setTwoFactorEnrollment] =
        useState<TwoFactorEnrollmentInitiateResponse | null>(null);
    const [showTwoFactorEnrollmentModal, setShowTwoFactorEnrollmentModal] = useState(false);
    const [twoFactorEnrollmentCode, setTwoFactorEnrollmentCode] = useState('');
    const [isInitiatingTwoFactorEnrollment, setIsInitiatingTwoFactorEnrollment] = useState(false);
    const [isVerifyingTwoFactorEnrollment, setIsVerifyingTwoFactorEnrollment] = useState(false);
    const [twoFactorStatus, setTwoFactorStatus] = useState<{ enabled: boolean; enrolled_at: string | null } | null>(null);
    const [isLoadingTwoFactorStatus, setIsLoadingTwoFactorStatus] = useState(false);

    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name,
                last_name: user.last_name,
                middle_name: user.middle_name || '',
                email: user.email,
                contact_number: user.contact_number || '',
            });
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            setTwoFactorStatus(null);
            return;
        }

        const loadTwoFactorStatus = async () => {
            setIsLoadingTwoFactorStatus(true);
            try {
                const status = await api.getTwoFactorStatus();
                setTwoFactorStatus({
                    enabled: status.enabled,
                    enrolled_at: status.enrolled_at,
                });
            } catch {
                toast.error('Failed to load 2FA status');
            } finally {
                setIsLoadingTwoFactorStatus(false);
            }
        };

        void loadTwoFactorStatus();
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await auth.updateMe(formData);
            await refreshUser();
            setIsEditing(false);
            toast.success('Profile updated successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async () => {
        if (!passwordData.current) {
            toast.error('Current password is required');
            return;
        }
        if (passwordData.new !== passwordData.confirm) {
            toast.error('Passwords do not match');
            return;
        }
        if (passwordData.new.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await auth.updateMe({
                password: passwordData.new,
                current_password: passwordData.current
            });
            setShowPasswordForm(false);
            setPasswordData({ current: '', new: '', confirm: '' });
            toast.success('Password updated successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const closeTwoFactorEnrollmentModal = () => {
        setShowTwoFactorEnrollmentModal(false);
        setTwoFactorEnrollment(null);
        setTwoFactorEnrollmentCode('');
    };

    const handleInitiateTwoFactorEnrollment = async () => {
        setIsInitiatingTwoFactorEnrollment(true);
        try {
            const enrollment = await api.initiateTwoFactorEnrollment();
            setTwoFactorEnrollment(enrollment);
            setTwoFactorEnrollmentCode('');
            setShowTwoFactorEnrollmentModal(true);
            toast.info('Scan the QR code in your authenticator app to continue setup.');
        } catch (error: unknown) {
            if (error instanceof AuthApiError && error.status === 400) {
                toast.info(error.message || 'Two-factor authentication is already enabled.');
            } else {
                const message = error instanceof Error ? error.message : 'Unable to initiate two-factor setup';
                toast.error(message);
            }
        } finally {
            setIsInitiatingTwoFactorEnrollment(false);
        }
    };

    const handleVerifyTwoFactorEnrollment = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!twoFactorEnrollment) {
            toast.error('No active two-factor enrollment found.');
            closeTwoFactorEnrollmentModal();
            return;
        }

        const code = twoFactorEnrollmentCode.trim();
        if (code.length < MIN_TWO_FACTOR_CODE_LENGTH) {
            toast.error('Enter a valid authenticator code.');
            return;
        }

        setIsVerifyingTwoFactorEnrollment(true);
        try {
            await api.verifyTwoFactorEnrollment(code);
            setTwoFactorStatus({ enabled: true, enrolled_at: new Date().toISOString() });
            toast.success('Two-factor authentication enabled.');
            closeTwoFactorEnrollmentModal();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to enable two-factor authentication';
            toast.error(message);
        } finally {
            setIsVerifyingTwoFactorEnrollment(false);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-10 px-4 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{user.first_name} {user.last_name}</h1>
                        <p className="text-sm text-muted-foreground uppercase tracking-wider">{user.role}</p>
                    </div>
                </div>
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="gap-2">
                        <Edit3 className="w-4 h-4" />
                        Edit
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} className="gap-2">
                            <Save className="w-4 h-4" />
                            Save
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Personal Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="First Name"
                                name="first_name"
                                value={formData.first_name || ''}
                                onChange={handleInputChange}
                                disabled={!isEditing || loading}
                            />
                            <Input
                                label="Last Name"
                                name="last_name"
                                value={formData.last_name || ''}
                                onChange={handleInputChange}
                                disabled={!isEditing || loading}
                            />
                        </div>
                        <Input
                            label="Middle Name"
                            name="middle_name"
                            value={formData.middle_name || ''}
                            onChange={handleInputChange}
                            disabled={!isEditing || loading}
                        />
                        <Input
                            label="Email"
                            name="email"
                            value={formData.email || ''}
                            onChange={handleInputChange}
                            disabled={!isEditing || loading}
                        />
                        <Input
                            label="Contact Number"
                            name="contact_number"
                            value={formData.contact_number || ''}
                            onChange={handleInputChange}
                            disabled={!isEditing || loading}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Security</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleInitiateTwoFactorEnrollment}
                                disabled={isInitiatingTwoFactorEnrollment || loading}
                            >
                                {isInitiatingTwoFactorEnrollment ? 'Preparing 2FA...' : 'Set up 2FA'}
                            </Button>
                            {!showPasswordForm && (
                                <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(true)}>
                                    Change Password
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 rounded-lg border border-border bg-muted/20 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Two-factor status</p>
                            <p className="text-sm font-medium text-foreground mt-1">
                                {isLoadingTwoFactorStatus
                                    ? 'Checking...'
                                    : twoFactorStatus?.enabled
                                        ? 'Enabled'
                                        : 'Not enabled'}
                            </p>
                            {!isLoadingTwoFactorStatus && twoFactorStatus?.enrolled_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Enrolled at: {formatDate(twoFactorStatus.enrolled_at)}
                                </p>
                            )}
                        </div>

                        {showPasswordForm ? (
                            <div className="space-y-4">
                                <Input
                                    type="password"
                                    label="Current Password"
                                    value={passwordData.current}
                                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                                />
                                <Input
                                    type="password"
                                    label="New Password"
                                    value={passwordData.new}
                                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                                />
                                <Input
                                    type="password"
                                    label="Confirm New Password"
                                    value={passwordData.confirm}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                />
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setShowPasswordForm(false);
                                        setPasswordData({ current: '', new: '', confirm: '' });
                                    }}>
                                        Cancel
                                    </Button>
                                    <Button size="sm" onClick={handlePasswordUpdate} disabled={loading}>
                                        Update Password
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">Password was last rotated on {user.password_rotated_at ? formatDate(user.password_rotated_at) : 'Never'}</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {showTwoFactorEnrollmentModal && twoFactorEnrollment && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="two-factor-enrollment-title"
                >
                    <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
                        <h2 id="two-factor-enrollment-title" className="text-lg font-semibold text-foreground">
                            Set up two-factor authentication
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Add this account to your authenticator app, then enter the generated code.
                        </p>

                        {twoFactorEnrollment.provisioning_uri && (
                            <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
                                <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
                                    Scan this QR code in your authenticator app
                                </p>
                                <div className="flex justify-center">
                                    <div className="rounded-lg bg-white p-3">
                                        <QRCodeSVG
                                            value={twoFactorEnrollment.provisioning_uri}
                                            size={180}
                                            bgColor="#FFFFFF"
                                            fgColor="#111827"
                                            level="M"
                                            includeMargin
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground" htmlFor="two-factor-enrollment-secret">
                                    Secret key
                                </label>
                                <input
                                    id="two-factor-enrollment-secret"
                                    type="text"
                                    readOnly
                                    value={twoFactorEnrollment.secret}
                                    onFocus={(e) => e.currentTarget.select()}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground" htmlFor="two-factor-enrollment-uri">
                                    Provisioning URI
                                </label>
                                <textarea
                                    id="two-factor-enrollment-uri"
                                    readOnly
                                    value={twoFactorEnrollment.provisioning_uri}
                                    rows={3}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none"
                                />
                            </div>
                        </div>

                        <form onSubmit={handleVerifyTwoFactorEnrollment} className="mt-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground" htmlFor="two-factor-enrollment-code">
                                    Authenticator code
                                </label>
                                <input
                                    id="two-factor-enrollment-code"
                                    type="text"
                                    required
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    minLength={MIN_TWO_FACTOR_CODE_LENGTH}
                                    maxLength={12}
                                    value={twoFactorEnrollmentCode}
                                    onChange={(e) => setTwoFactorEnrollmentCode(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-yellow-500/50 focus:ring-[3px] focus:ring-yellow-500/10"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                                    onClick={closeTwoFactorEnrollmentModal}
                                    disabled={isVerifyingTwoFactorEnrollment}
                                >
                                    Do this later
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-yellow-950 hover:bg-yellow-600 disabled:opacity-60"
                                    disabled={isVerifyingTwoFactorEnrollment}
                                >
                                    {isVerifyingTwoFactorEnrollment ? 'Enabling...' : 'Enable 2FA'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
