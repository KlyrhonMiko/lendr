'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Globe, Mail, UserCheck, Flag, Save, Send } from 'lucide-react';
import { toast } from 'sonner';

export function GeneralSettings() {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('General settings updated successfully');
    }, 1000);
  };

  const handleSendTestEmail = () => {
    setTestLoading(true);
    setTimeout(() => {
      setTestLoading(false);
      toast.success('Test email sent to admin@example.com');
    }, 1500);
  };

  const featureFlags = [
    { id: 1, name: 'Advanced Search', description: 'Enable AI-powered semantic search for inventory items.', status: true, roles: ['Admin', 'Manager'] },
    { id: 2, name: 'Bulk Import', description: 'Allow users to import items via CSV/Excel files.', status: true, roles: ['Admin'] },
    { id: 3, name: 'Expiry Notifications', description: 'Send automated alerts for items nearing expiration.', status: false, roles: ['All Roles'] },
    { id: 4, name: 'Multi-warehouse Support', description: 'Manage inventory across multiple physical locations.', status: false, roles: ['Admin'] },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Localization and Regional Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Localization and Regional Settings</CardTitle>
            <CardDescription>Configure how dates, times, and languages are displayed across the system.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <Select 
            label="Timezone" 
            defaultValue="Asia/Manila"
            options={[
              { label: '(UTC+08:00) Manila, Beijing, Singapore', value: 'Asia/Manila' },
              { label: '(UTC+00:00) Coordinated Universal Time', value: 'UTC' },
              { label: '(UTC+09:00) Tokyo, Seoul', value: 'Asia/Tokyo' },
              { label: '(UTC-05:00) Eastern Time (US & Canada)', value: 'America/New_York' }
            ]} 
          />
          <Select 
            label="Date Format" 
            defaultValue="MM/DD/YYYY"
            options={[
              { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
              { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
              { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' }
            ]} 
          />
          <Select 
            label="Time Format" 
            defaultValue="12h"
            options={[
              { label: '12-hour (AM/PM)', value: '12h' },
              { label: '24-hour', value: '24h' }
            ]} 
          />
          <Select 
            label="Language" 
            defaultValue="en"
            options={[
              { label: 'English', value: 'en' },
              { label: 'Spanish (Coming Soon)', value: 'es' },
              { label: 'French (Coming Soon)', value: 'fr' }
            ]} 
          />
        </CardContent>
      </Card>

      {/* Email / SMTP Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <CardTitle>Email / SMTP Configuration</CardTitle>
            <CardDescription>Set up the mail server for system notifications and alerts.</CardDescription>
          </div>
          <button 
            onClick={handleSendTestEmail}
            disabled={testLoading}
            className="flex items-center gap-2 px-4 py-2 bg-secondary/50 text-secondary-foreground rounded-lg text-xs font-bold border border-border hover:bg-secondary transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {testLoading ? 'Sending...' : 'Send Test Email'}
          </button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Input label="SMTP Host" placeholder="smtp.example.com" defaultValue="smtp.lendr.app" />
            <Input label="SMTP Port" type="number" placeholder="587" defaultValue="587" />
            <Select 
              label="Encryption" 
              defaultValue="tls"
              options={[
                { label: 'None', value: 'none' },
                { label: 'SSL', value: 'ssl' },
                { label: 'TLS', value: 'tls' }
              ]} 
            />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Input label="Sender Email Address" placeholder="noreply@example.com" defaultValue="notifications@lendr.app" />
            <Input label="Sender Display Name" placeholder="Lendr Notifications" defaultValue="Lendr System" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Input label="SMTP Username" placeholder="Username" defaultValue="smtp_user_123" />
            <Input label="SMTP Password" type="password" placeholder="••••••••" defaultValue="password123" />
          </div>
        </CardContent>
      </Card>

      {/* User Defaults */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>User Defaults</CardTitle>
            <CardDescription>Configure default settings for newly registered or created users.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <Select 
            label="Default Role" 
            defaultValue="member"
            options={[
              { label: 'Super Admin', value: 'super_admin' },
              { label: 'Admin', value: 'admin' },
              { label: 'Member', value: 'member' },
              { label: 'Guest', value: 'guest' }
            ]} 
          />
          <Select 
            label="Default Landing Page" 
            defaultValue="dashboard"
            options={[
              { label: 'Dashboard', value: 'dashboard' },
              { label: 'Inventory', value: 'inventory' },
              { label: 'Requests', value: 'requests' },
              { label: 'Analytics', value: 'analytics' }
            ]} 
          />
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Feature Flags</CardTitle>
            <CardDescription>Enable or disable optional and experimental system features.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 border-t border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-4">Feature Name & Description</th>
                  <th className="px-6 py-4">Affected Roles</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {featureFlags.map((feature) => (
                  <tr key={feature.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">{feature.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{feature.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {feature.roles.map(role => (
                          <span key={role} className="px-2 py-0.5 bg-muted rounded-md text-[10px] font-medium border border-border">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <Toggle defaultChecked={feature.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Saving Changes...' : 'Save General Configuration'}
        </button>
      </div>
    </div>
  );
}
