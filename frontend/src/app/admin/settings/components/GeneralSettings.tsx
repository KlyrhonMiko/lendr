'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Globe, Mail, Save, Send, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useGeneralSettings, useGeneralMutations } from '../lib/useSettingsQueries';

interface LocalizationSettings {
  timezone: string;
  date_format: string;
  time_format: string;
  language: string;
}

interface GeneralSettingsPayload {
  localization: LocalizationSettings;
}

export function GeneralSettings() {
  const [localSettings, setLocalSettings] = useState<GeneralSettingsPayload | null>(null);

  // Queries
  const { data: settingsRes, isLoading } = useGeneralSettings();

  // Mutations
  const { updateGeneral } = useGeneralMutations();

  const settings = localSettings || settingsRes?.data || null;
  const saving = updateGeneral.isPending;

  useEffect(() => {
    if (settingsRes?.data && !localSettings) {
      setLocalSettings(settingsRes.data);
    }
  }, [settingsRes, localSettings]);

  const handleSave = async () => {
    if (!settings) return;
    updateGeneral.mutate(settings);
  };

  const updateLocalization = (key: keyof LocalizationSettings, value: string) => {
    if (!settings) return;
    setLocalSettings({
      ...settings,
      localization: { ...settings.localization, [key]: value }
    });
  };

  if (isLoading && !settings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading settings...</p>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Localization and Regional Settings */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-start gap-4 bg-muted/30 pb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-colors">
            <Globe className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl">Localization and Regional Settings</CardTitle>
            <CardDescription>Configure how dates, times, and languages are displayed across the system.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 pt-6">
          <Select 
            label="Timezone" 
            value={settings.localization.timezone}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLocalization('timezone', e.target.value)}
            options={[
              { label: '(UTC+08:00) Manila, Beijing, Singapore', value: 'Asia/Manila' },
              { label: '(UTC+00:00) Coordinated Universal Time', value: 'UTC' },
              { label: '(UTC+09:00) Tokyo, Seoul', value: 'Asia/Tokyo' },
              { label: '(UTC-05:00) Eastern Time (US & Canada)', value: 'America/New_York' },
              { label: '(UTC+01:00) Central European Time', value: 'Europe/Berlin' }
            ]} 
          />
          <Select 
            label="Date Format" 
            value={settings.localization.date_format}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLocalization('date_format', e.target.value)}
            options={[
              { label: 'MM/DD/YYYY (USA Style)', value: 'MM/DD/YYYY' },
              { label: 'DD/MM/YYYY (PH Style)', value: 'DD/MM/YYYY' },
              { label: 'YYYY-MM-DD (ISO standard)', value: 'YYYY-MM-DD' }
            ]} 
          />
          <Select 
            label="Time Format" 
            value={settings.localization.time_format}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLocalization('time_format', e.target.value)}
            options={[
              { label: '12-hour (AM/PM)', value: '12h' },
              { label: '24-hour (Military)', value: '24h' }
            ]} 
          />
          <Select 
            label="Language" 
            value={settings.localization.language}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLocalization('language', e.target.value)}
            options={[
              { label: 'English (US)', value: 'en' },
              { label: 'Spanish (Coming Soon)', value: 'es' },
              { label: 'French (Coming Soon)', value: 'fr' }
            ]} 
          />
        </CardContent>
      </Card>

      {/* Email / SMTP Configuration - Flagged as Future Feature */}
      <Card className="border-border/50 shadow-sm opacity-80 overflow-hidden relative grayscale-[0.5]">
        <div className="absolute inset-0 z-10 bg-background/5 cursor-not-allowed" />
        <CardHeader className="flex flex-row items-center gap-4 bg-muted/10">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Email / SMTP Configuration</CardTitle>
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-500/20">
                Future Feature
              </span>
            </div>
            <CardDescription>Setup automated email notifications for borrow requests and returns.</CardDescription>
          </div>
          <button 
            disabled
            className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-bold border border-border opacity-50 cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            Send Test Email
          </button>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-center gap-3 text-amber-600/80 text-xs font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>Email configuration is currently in development and will be available in a future update.</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-50">
            <Input label="SMTP Host" placeholder="smtp.example.com" disabled />
            <Input label="SMTP Port" type="number" placeholder="587" disabled />
            <Select 
              label="Encryption" 
              defaultValue="tls"
              disabled
              options={[{ label: 'TLS', value: 'tls' }]} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 sticky bottom-0 bg-background/80 backdrop-blur-sm pb-4 border-t border-border/40 z-20">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-10 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? 'Saving...' : 'Save General Configuration'}
        </button>
      </div>
    </div>
  );
}
