'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Image as ImageIcon, Globe, Tablet, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBrandingSettings, useBrandingMutations } from '../lib/useSettingsQueries';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface BrandingSettings {
  visual_identity: {
    brand_name: string;
    system_theme: string;
    logo_url: string | null;
    favicon_url: string | null;
  };
}

export function BrandingSettings() {
  const [localSettings, setLocalSettings] = useState<BrandingSettings | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: brandingRes, isLoading: fetching } = useBrandingSettings();

  // Mutations
  const { updateBranding, uploadBrandingFile } = useBrandingMutations();

  const settings = localSettings || brandingRes?.data || {
    visual_identity: { brand_name: 'Lendr', system_theme: 'system', logo_url: null, favicon_url: null },
  };

  const loading = updateBranding.isPending || uploadBrandingFile.isPending;

  useEffect(() => {
    if (brandingRes?.data && !localSettings) {
      setLocalSettings(brandingRes.data);
    }
  }, [brandingRes, localSettings]);

  const handleUpload = async (file: File, type: 'logo' | 'favicon') => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    uploadBrandingFile.mutate(formData, {
      onSuccess: (response) => {
        setLocalSettings(prev => prev ? {
          ...prev,
          visual_identity: {
            ...prev.visual_identity,
            [type === 'logo' ? 'logo_url' : 'favicon_url']: response.data.url
          }
        } : null);
        toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);
      }
    });
  };

  const handleSave = async () => {
    updateBranding.mutate(settings, {
      onSuccess: () => setLocalSettings(null)
    });
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground italic">Fetching branding profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <input 
        type="file" 
        className="hidden" 
        ref={logoInputRef} 
        accept="image/*" 
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo')}
      />
      <input 
        type="file" 
        className="hidden" 
        ref={faviconInputRef} 
        accept="image/*" 
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'favicon')}
      />

      {/* Platform Branding */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Platform Branding</CardTitle>
            <CardDescription>Configure your organization's visual identity across the system.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <Input 
              label="Organization Name" 
              placeholder="e.g. Lendr Corp" 
              value={settings.visual_identity.brand_name ?? ''}
              onChange={(e) => setLocalSettings({
                ...settings,
                visual_identity: { ...settings.visual_identity, brand_name: e.target.value }
              })}
            />
            
            <Select 
              label="System Theme" 
              value={settings.visual_identity.system_theme ?? 'system'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocalSettings({
                ...settings,
                visual_identity: { ...settings.visual_identity, system_theme: e.target.value }
              })}
              options={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                { label: 'System Default', value: 'system' }
              ]} 
            />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground px-1">Organization Logo</label>
              <div 
                onClick={() => logoInputRef.current?.click()}
                className="relative overflow-hidden border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer group h-[140px]"
              >
                {settings.visual_identity.logo_url ? (
                  <Image
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${settings.visual_identity.logo_url}`} 
                    alt="Logo Preview" 
                    width={200}
                    height={50}
                    unoptimized
                    className="max-h-full max-w-full object-contain pointer-events-none"
                  />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform shadow-sm">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP (Recommended: 200x50px)</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground px-1">Favicon</label>
                <div 
                  onClick={() => faviconInputRef.current?.click()}
                  className="relative overflow-hidden border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer h-[70px]"
                >
                  {settings.visual_identity.favicon_url ? (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${settings.visual_identity.favicon_url}`} 
                      alt="Favicon Preview" 
                      width={32}
                      height={32}
                      unoptimized
                      className="w-8 h-8 object-contain pointer-events-none"
                    />
                  ) : (
                    <>
                      <Tablet className="w-5 h-5 text-muted-foreground" />
                      <p className="text-[10px] text-center text-muted-foreground">32x32 PNG</p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-end pb-1">
                 <p className="text-xs text-muted-foreground italic">Current logo and favicon will be used system-wide.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-bold shadow-sm transition-all active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Branding Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
