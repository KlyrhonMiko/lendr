'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth, User } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    User as UserIcon,
    Edit3,
    Save,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<User>>({});
    const [currentPasswordForSensitive, setCurrentPasswordForSensitive] = useState('');

    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name,
                last_name: user.last_name,
                middle_name: user.middle_name || '',
                email: user.email,
                username: user.username,
                contact_number: user.contact_number || '',
            });
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        const isEmailChanged = (formData.email || '').trim() !== user?.email;
        const isUsernameChanged = (formData.username || '').trim() !== user?.username;
        const requiresCurrentPassword = isEmailChanged || isUsernameChanged;

        if (requiresCurrentPassword && !currentPasswordForSensitive) {
            toast.error('Current password is required when changing email or username');
            return;
        }

        const payload: Partial<User> = {
            first_name: formData.first_name,
            last_name: formData.last_name,
            middle_name: formData.middle_name,
            email: formData.email,
            contact_number: formData.contact_number,
            username: formData.username,
        };

        if (requiresCurrentPassword) {
            payload.current_password = currentPasswordForSensitive;
        }

        setLoading(true);
        try {
            await auth.updateMe(payload);
            await refreshUser();
            setIsEditing(false);
            setCurrentPasswordForSensitive('');
            if (requiresCurrentPassword) {
                toast.success('Profile updated successfully. Sensitive changes were verified.');
            } else {
                toast.success('Profile updated successfully');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
            toast.error(errorMessage);
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
            await refreshUser();
            setShowPasswordForm(false);
            setPasswordData({ current: '', new: '', confirm: '' });
            toast.success('Password updated successfully');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update password';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
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
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setIsEditing(false);
                                setCurrentPasswordForSensitive('');
                            }}
                            disabled={loading}
                        >
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
                            label="Username"
                            name="username"
                            value={formData.username || ''}
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
                        {isEditing && (
                            <Input
                                type="password"
                                label="Current Password (required for email/username changes)"
                                value={currentPasswordForSensitive}
                                onChange={(e) => setCurrentPasswordForSensitive(e.target.value)}
                                disabled={loading}
                            />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Security</CardTitle>
                        {!showPasswordForm && (
                            <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(true)}>
                                Change Password
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
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
        </div>
    );
}
