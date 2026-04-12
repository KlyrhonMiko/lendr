'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormSelect } from '@/components/ui/form-select';
import { Globe, Save, Loader2 } from 'lucide-react';
import { useGeneralSettings, useGeneralMutations } from '../lib/useSettingsQueries';
import type { GeneralSettingsData } from '../api';

type LocalizationSettings = GeneralSettingsData['localization'];

export function GeneralSettings() {
  const [localSettings, setLocalSettings] = useState<GeneralSettingsData | null>(null);

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
          <FormSelect
            label="Timezone"
            value={settings.localization.timezone}
            onChange={(value) => updateLocalization('timezone', value)}
            options={[
              { label: '(UTC+08:00) Manila, Beijing, Singapore', key: 'Asia/Manila' },
              { label: '(UTC+00:00) Coordinated Universal Time', key: 'UTC' },
              { label: '(UTC+09:00) Tokyo, Seoul', key: 'Asia/Tokyo' },
              { label: '(UTC-05:00) Eastern Time (US & Canada)', key: 'America/New_York' },
              { label: '(UTC+01:00) Central European Time', key: 'Europe/Berlin' }
            ]}
            placeholder="Select timezone"
          />
          <FormSelect
            label="Date Format"
            value={settings.localization.date_format}
            onChange={(value) => updateLocalization('date_format', value)}
            options={[
              { label: 'MM/DD/YYYY (USA Style)', key: 'MM/DD/YYYY' },
              { label: 'DD/MM/YYYY (PH Style)', key: 'DD/MM/YYYY' },
              { label: 'YYYY-MM-DD (ISO standard)', key: 'YYYY-MM-DD' }
            ]}
            placeholder="Select date format"
          />
          <FormSelect
            label="Time Format"
            value={settings.localization.time_format}
            onChange={(value) => updateLocalization('time_format', value)}
            options={[
              { label: '12-hour (AM/PM)', key: '12h' },
              { label: '24-hour (Military)', key: '24h' }
            ]}
            placeholder="Select time format"
          />
          <FormSelect
            label="Language"
            value={settings.localization.language}
            onChange={(value) => updateLocalization('language', value)}
            options={[
              { label: 'English (US)', key: 'en' },
              { label: 'Spanish (Coming Soon)', key: 'es' },
              { label: 'French (Coming Soon)', key: 'fr' }
            ]}
            placeholder="Select language"
          />
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
