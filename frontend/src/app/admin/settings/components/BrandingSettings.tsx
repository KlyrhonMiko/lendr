'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Image as ImageIcon, Globe, Tablet, BellRing, Save } from 'lucide-react';
import { toast } from 'sonner';

export function BrandingSettings() {
  const [loading, setLoading] = useState(false);
  
  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Branding settings updated successfully');
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            <Input label="Organization Name" placeholder="e.g. Lendr Corp" defaultValue="Lendr" />
            
            <Select 
              label="System Theme" 
              defaultValue="system"
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
              <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform shadow-sm">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG (Recommended: 200x50px)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground px-1">Favicon</label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer">
                  <Tablet className="w-5 h-5 text-muted-foreground" />
                  <p className="text-[10px] text-center text-muted-foreground">32x32 PNG</p>
                </div>
              </div>
              <div className="flex items-end pb-1">
                 <p className="text-xs text-muted-foreground italic">Current logo and favicon will be used system-wide.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcement Banner */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <CardTitle>System-wide Announcement Banner</CardTitle>
            <CardDescription>Display a global notification banner to all active users.</CardDescription>
          </div>
          <Toggle label="Enable Banner" defaultChecked={false} />
        </CardHeader>
        <CardContent className="space-y-6">
          <Textarea label="Banner Message" placeholder="Enter the announcement text here..." />
          
          <div className="grid gap-6 md:grid-cols-3">
            <Select 
              label="Banner Type" 
              defaultValue="info"
              options={[
                { label: 'Informational', value: 'info' },
                { label: 'Warning', value: 'warning' },
                { label: 'Critical', value: 'error' }
              ]} 
            />
            
            <Input label="Expiry Date" type="date" />
            <Input label="Expiry Time" type="time" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-bold shadow-sm transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Branding Configuration'}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
