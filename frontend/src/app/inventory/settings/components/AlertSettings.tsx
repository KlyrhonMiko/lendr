'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { BellRing, Save, ShieldCheck, Mail, MessageSquare, Monitor, AlertTriangle, Users, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SpecificRecipient {
  name: string;
  email?: string;
  phone?: string;
}

interface AlertSettingsData {
  low_stock_threshold: number;
  overstock_threshold: number;
  expiry_threshold: number;
  borrow_request_alert_duration: number;
  borrow_request_alert_unit: string;
  notification_channels: string[];
  alert_recipient_roles: string[];
  specific_recipients: SpecificRecipient[];
}

function AddRecipientDialog({ 
  onAdd, 
  existingRecipients 
}: { 
  onAdd: (rec: SpecificRecipient) => void,
  existingRecipients: SpecificRecipient[]
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleAdd = () => {
    if (!name) {
      toast.error('Name is required');
      return;
    }
    if (!email && !phone) {
        toast.error('Either email or phone is required');
        return;
    }

    // Duplication Check
    const isDuplicate = existingRecipients.some(rec => 
      (email && rec.email?.toLowerCase() === email.toLowerCase()) || 
      (phone && rec.phone === phone)
    );

    if (isDuplicate) {
      toast.error('A recipient with this email or phone number already exists');
      return;
    }

    onAdd({ name, email: email || undefined, phone: phone || undefined });
    setName('');
    setEmail('');
    setPhone('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="text-xs text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-1 transition-colors hover:underline outline-none">
        <Plus className="w-3 h-3" />
        Add Recipient
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-5 rounded-2xl border-border shadow-2xl">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold">Add Specific Recipient</h4>
            <p className="text-xs text-muted-foreground">They'll be notified via the selected channels.</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Full Name</label>
              <Input 
                placeholder="e.g. John Doe" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-10 rounded-xl bg-muted/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Email Address</label>
              <Input 
                placeholder="john@example.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-10 rounded-xl bg-muted/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Contact Number</label>
              <Input 
                placeholder="+63 9xx xxx xxxx" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="h-10 rounded-xl bg-muted/30"
              />
            </div>
          </div>
          <button 
            onClick={handleAdd}
            className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
          >
            Add to List
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AlertSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<AlertSettingsData | null>(null);

  // Fetch settings from dedicated endpoint
  const { data: remoteData, isLoading } = useQuery({
    queryKey: ['inventory', 'settings', 'alerts'],
    queryFn: async () => {
      const response = await api.get<AlertSettingsData>('/inventory/settings/alerts');
      return response.data;
    }
  });

  // Sync remote data to local form state on load
  useEffect(() => {
    if (remoteData) {
      setFormData(remoteData);
    }
  }, [remoteData]);

  // Mutation to update settings
  const mutation = useMutation({
    mutationFn: (newData: AlertSettingsData) => 
      api.put('/inventory/settings/alerts', newData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'settings', 'alerts'] });
      toast.success('Alert settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    }
  });

  const handleSave = () => {
    if (formData) {
      mutation.mutate(formData);
    }
  };

  const handleInputChange = (key: keyof AlertSettingsData, value: string | number) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [key]: typeof value === 'string' && !isNaN(Number(value)) && value !== '' ? Number(value) : value
    });
  };

  const toggleListValue = (key: 'notification_channels' | 'alert_recipient_roles', value: string) => {
    if (!formData) return;
    const currentList = formData[key];
    const newList = currentList.includes(value)
      ? currentList.filter(v => v !== value)
      : [...currentList, value];
    
    setFormData({ ...formData, [key]: newList });
  };
    
  const addSpecificRecipient = (recipient: SpecificRecipient) => {
    if (!formData) return;
    setFormData({
      ...formData,
      specific_recipients: [...formData.specific_recipients, recipient]
    });
  };

  const removeSpecificRecipient = (index: number) => {
    if (!formData) return;
    const newList = [...formData.specific_recipients];
    newList.splice(index, 1);
    setFormData({ ...formData, specific_recipients: newList });
  };

  if (isLoading || !formData) {
    return (
      <div className="space-y-8 animate-pulse pb-10">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-64 bg-muted/20 rounded-2xl border border-border" />
        ))}
      </div>
    );
  }

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
                    value={formData.low_stock_threshold}
                    onChange={(e) => handleInputChange('low_stock_threshold', e.target.value)}
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
                    value={formData.overstock_threshold}
                    onChange={(e) => handleInputChange('overstock_threshold', e.target.value)}
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
                    value={formData.expiry_threshold}
                    onChange={(e) => handleInputChange('expiry_threshold', e.target.value)}
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
                    value={formData.borrow_request_alert_duration}
                    onChange={(e) => handleInputChange('borrow_request_alert_duration', e.target.value)}
                  />
                </div>
                <div className="w-40">
                  <Select 
                    value={formData.borrow_request_alert_unit}
                    onChange={(e) => handleInputChange('borrow_request_alert_unit', e.target.value)}
                    options={[
                      { label: 'Minutes', value: 'minutes' },
                      { label: 'Hours', value: 'hours' },
                      { label: 'Days', value: 'days' }
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
              const isChecked = formData.notification_channels.includes(channel.id);
              return (
                <label 
                  key={channel.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all flex-1 min-w-[200px] cursor-pointer ${
                    isChecked ? 'border-indigo-500 bg-indigo-500/5' : 'border-border bg-muted/20 hover:bg-muted/30'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded-lg border-border text-indigo-500 focus:ring-indigo-500" 
                    checked={isChecked}
                    onChange={() => toggleListValue('notification_channels', channel.id)}
                  />
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
              {[
                { id: 'inventory_manager', label: 'Inventory Manager' },
                { id: 'admin', label: 'Admin' }
              ].map((role) => {
                const isChecked = formData.alert_recipient_roles.includes(role.id);
                return (
                  <label 
                    key={role.id} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer ${
                      isChecked ? 'border-emerald-500 bg-emerald-500/5' : 'border-border bg-card hover:bg-muted'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500" 
                      checked={isChecked}
                      onChange={() => toggleListValue('alert_recipient_roles', role.id)}
                    />
                    <span className="text-xs font-bold">{role.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between text-sm font-semibold px-1">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Specific Recipients
              </span>
              <AddRecipientDialog 
                onAdd={addSpecificRecipient} 
                existingRecipients={formData.specific_recipients}
              />
            </div>
            
            {formData.specific_recipients.length === 0 ? (
              <div className="bg-muted/10 border border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-1">
                    <Users className="w-6 h-6 opacity-20" />
                </div>
                <p className="text-sm font-medium">No specific recipients added</p>
                <p className="text-xs">Add specific individuals to receive alerts regardless of their role.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {formData.specific_recipients.map((rec, idx) => (
                  <div key={idx} className="group relative bg-muted/30 border border-border rounded-2xl p-4 flex items-center gap-4 transition-all hover:border-indigo-500/30 hover:bg-muted/50">
                    <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-indigo-500 font-bold text-xs">
                        {rec.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{rec.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{rec.email || rec.phone || 'No contact info'}</p>
                    </div>
                    <button 
                      onClick={() => removeSpecificRecipient(idx)}
                      aria-label={`Remove recipient ${rec.name}`}
                      className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end p-6 border-t border-border/50">
          <button 
            onClick={handleSave}
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            {mutation.isPending ? 'Saving...' : 'Save Configuration'}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
