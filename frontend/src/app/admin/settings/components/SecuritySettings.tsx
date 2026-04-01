'use client';

import { Shield, Key, Lock, Clock, Globe, Users, Calendar, Plus, Trash2, Edit2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useState } from 'react';
import { toast } from 'sonner';

export function SecuritySettings() {
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Security configurations updated');
    }, 1000);
  };

  const shifts = [
    { id: 1, name: 'Morning Shift', start: '06:00 AM', end: '02:00 PM', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    { id: 2, name: 'Afternoon Shift', start: '02:00 PM', end: '10:00 PM', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    { id: 3, name: 'Night Shift', start: '10:00 PM', end: '06:00 AM', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  ];

  const rbac = [
    { role: 'Super Admin', permissions: 'Full Access', users: 2 },
    { role: 'Manager', permissions: 'Inventory, Reports, Users', users: 5 },
    { role: 'Staff', permissions: 'Borrow, View Items', users: 24 },
    { role: 'Guest', permissions: 'View Public Info', users: 156 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
              <CardDescription>Enhance account security by requiring a second verification step.</CardDescription>
            </div>
            <Toggle defaultChecked={true} />
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-3">
               <label className="text-sm font-semibold text-foreground px-1">Require 2FA for specific roles:</label>
               <div className="grid grid-cols-2 gap-3">
                 {['Super Admin', 'Admin', 'Manager', 'Staff'].map((role) => (
                   <label key={role} className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                     <input type="checkbox" defaultChecked={role !== 'Staff'} className="w-4 h-4 rounded border-border text-indigo-500 focus:ring-indigo-500" />
                     <span className="text-sm font-medium">{role}</span>
                   </label>
                 ))}
               </div>
             </div>
             <Select 
               label="Supported Methods" 
               defaultValue="both"
               options={[
                 { label: 'Authenticator App Only', value: 'app' },
                 { label: 'Email OTP Only', value: 'email' },
                 { label: 'Both (User Choice)', value: 'both' }
               ]} 
             />
          </CardContent>
        </Card>

        {/* Password Rules */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Key className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Password Rules</CardTitle>
              <CardDescription>Enforce strict password complexity and rotation policies.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6">
             <div className="space-y-4">
               <Input label="Minimum Length" type="number" defaultValue="8" />
               <Toggle label="Require Uppercase" defaultChecked={true} />
               <Toggle label="Require Number" defaultChecked={true} />
               <Toggle label="Require Special Char" defaultChecked={true} />
             </div>
             <div className="space-y-4">
               <Input label="Prevent reuse of last N" type="number" defaultValue="5" />
               <div className="space-y-3 pt-1">
                 <Toggle label="Enable Password Expiry" defaultChecked={false} />
                 <Input label="Expire every (days)" type="number" defaultValue="90" disabled />
               </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Login Attempt Lockout */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Lock className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg">Lockout Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <Input label="Max failed attempts" type="number" defaultValue="3" />
             <Input label="Lockout duration (mins)" type="number" defaultValue="15" />
             <Toggle label="Notify admin on lockout" defaultChecked={true} />
          </CardContent>
        </Card>

        {/* Session Timeout */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Clock className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg">Session Timeout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <Input label="Auto-logout after (mins)" type="number" defaultValue="30" />
             <Toggle label="Show warning prompt" defaultChecked={true} />
             <Input label="Warn before (mins)" type="number" defaultValue="2" />
          </CardContent>
        </Card>

        {/* IP Access Control */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Globe className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg">IP Access Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-3">
               <div className="flex justify-between items-center">
                 <label className="text-sm font-semibold text-foreground">Allowlist</label>
                 <Toggle />
               </div>
               <Input placeholder="e.g. 192.168.1.1/24" />
             </div>
             <div className="space-y-3">
               <div className="flex justify-between items-center">
                 <label className="text-sm font-semibold text-foreground">Blocklist</label>
                 <Toggle />
               </div>
               <Input placeholder="e.g. 10.0.0.0/8" />
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* RBAC Overview */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <CardTitle>RBAC Overview</CardTitle>
              <CardDescription>Summary of roles and their assigned permissions.</CardDescription>
            </div>
            <button className="text-xs font-bold text-primary hover:underline">Manage Roles</button>
          </CardHeader>
          <CardContent className="p-0 border-t border-border flex-1">
             <table className="w-full text-sm text-left">
               <thead className="bg-muted/30 text-muted-foreground font-semibold">
                 <tr>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Permissions</th>
                    <th className="px-6 py-4 text-right">Users</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border/50">
                 {rbac.map((role) => (
                   <tr key={role.role} className="hover:bg-muted/10">
                     <td className="px-6 py-4 font-bold">{role.role}</td>
                     <td className="px-6 py-4 text-xs text-muted-foreground">{role.permissions}</td>
                     <td className="px-6 py-4 text-right">{role.users}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </CardContent>
        </Card>

        {/* Shift Definitions */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Shift Definitions</CardTitle>
              <CardDescription>Manage working hours for system-wide scheduling.</CardDescription>
            </div>
            <button aria-label="Add shift definition" className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent className="p-0 border-t border-border flex-1">
             <div className="divide-y divide-border/50">
               {shifts.map((shift) => (
                 <div key={shift.id} className="p-6 flex items-center gap-6 hover:bg-muted/10 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">{shift.name}</h4>
                      <div className="flex gap-4 text-xs text-muted-foreground mb-3 font-mono">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> {shift.start} - {shift.end}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> {shift.days.length} Days</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                          <span key={day} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${shift.days.includes(day) ? 'bg-primary text-primary-foreground border-primary/20' : 'bg-secondary/50 text-muted-foreground border-border/50'}`}>
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button aria-label={`Edit ${shift.name} shift`} className="p-2 hover:bg-muted rounded-lg border border-border"><Edit2 className="w-4 h-4"/></button>
                       <button aria-label={`Delete ${shift.name} shift`} className="p-2 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg border border-border"><Trash2 className="w-4 h-4"/></button>
                    </div>
                 </div>
               ))}
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Updating security...' : 'Save Security Rules'}
        </button>
      </div>
    </div>
  );
}
