'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { BellRing, Save, ShieldCheck, Mail, MessageSquare, Monitor, Layout, AlertTriangle, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

export function AlertSettings() {
  const [loading, setLoading] = useState(false);
  
  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Alert settings updated successfully');
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Stock Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <CardTitle>Inventory Threshold Alerts</CardTitle>
            <CardDescription>Configure warning thresholds for stock levels and expiration dates.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <div className="grid gap-4">
              <label className="text-sm font-semibold text-foreground px-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Low Stock Warning
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input 
                    type="number" 
                    placeholder="20" 
                  />
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">of total allocated quantity</span>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="text-sm font-semibold text-foreground px-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Overstock Warning
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input 
                    type="number" 
                    placeholder="150" 
                  />
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">of total allocated quantity</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4">
              <label className="text-sm font-semibold text-foreground px-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Expiry Warning
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input 
                    type="number" 
                    placeholder="15" 
                  />
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">of total shelf life remaining</span>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="text-sm font-semibold text-foreground px-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Borrow Request Alerts
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input 
                    type="number" 
                    placeholder="60" 
                  />
                </div>
                <div className="w-32">
                  <Select 
                    defaultValue="minutes"
                    options={[
                      { label: 'Minutes', value: 'minutes' },
                      { label: 'Hours', value: 'hours' }
                    ]} 
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic px-1">Alert when a borrow request has been pending approval for more than: </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <CardTitle>Notification Channels</CardTitle>
            <CardDescription>Select how alerts are delivered to the recipients.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-4">
            {[
              { id: 'in-app', label: 'In-app Notification', icon: Monitor, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
              { id: 'email', label: 'Email', icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { id: 'sms', label: 'SMS', icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            ].map((channel) => {
              const Icon = channel.icon;
              return (
                <label 
                  key={channel.id}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-muted/20 cursor-pointer hover:bg-muted/30 transition-all flex-1 min-w-[200px]"
                >
                  <input type="checkbox" className="w-5 h-5 rounded-lg border-border text-indigo-500 focus:ring-indigo-500" defaultChecked />
                  <div className={`w-10 h-10 rounded-xl ${channel.bg} flex items-center justify-center ${channel.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm">{channel.label}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alert Recipients */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <CardTitle>Alert Recipients</CardTitle>
            <CardDescription>Select which roles or specific users receive each type of alert.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-semibold px-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Role-based Targeting
            </div>
            <div className="flex flex-wrap gap-3">
              {['Inventory Manager', 'Admin', 'Staff', 'Procurement Officer'].map((role) => (
                <label key={role} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-muted transition-all cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-border text-indigo-500 focus:ring-indigo-500" />
                  <span className="text-xs font-bold">{role}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between text-sm font-semibold px-1">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Specific Recipients
              </span>
              <button className="text-xs text-indigo-500 hover:underline">Add specific users +</button>
            </div>
            <div className="bg-muted/10 border border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <p className="text-sm font-medium">No specific users added</p>
              <p className="text-xs">Add specific users to receive alerts regardless of their roles.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end p-6 border-t border-border/50">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
