'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, User as UserIcon, Mail, Shield, Clock, Hash, Phone, UserCircle } from 'lucide-react';
import { userApi, User, UserCreate, UserUpdate, AuthConfig } from './api';
import { toast } from 'sonner';

interface UserModalProps {
  user?: User; // If provided, we are in Edit mode
  onClose: () => void;
  onSuccess: () => void;
}

export function UserModal({ user, onClose, onSuccess }: UserModalProps) {
  const isEdit = !!user;
  const [loading, setLoading] = useState(false);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [roles, setRoles] = useState<AuthConfig[]>([]);
  const [shifts, setShifts] = useState<AuthConfig[]>([]);

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    middle_name: user?.middle_name || '',
    contact_number: user?.contact_number || '',
    employee_id: user?.employee_id || '',
    role: user?.role || '',
    shift_type: user?.shift_type || 'day',
  });

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const [rolesRes, shiftsRes] = await Promise.all([
          userApi.getConfigs('users_role'),
          userApi.getConfigs('users_shift_type'),
        ]);
        setRoles(rolesRes.data);
        setShifts(shiftsRes.data);
        
        // If creating and no role selected, pick first role as default
        if (!isEdit && !formData.role && rolesRes.data.length > 0) {
          setFormData(prev => ({ ...prev, role: rolesRes.data[0].key }));
        }
      } catch (err) {
        toast.error('Failed to load roles and shift types');
      } finally {
        setConfigsLoading(false);
      }
    };
    fetchConfigs();
  }, [isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        // Deep copy of formData
        const updateData: UserUpdate = { ...formData };
        if (!updateData.password) {
            delete (updateData as any).password;
        }
        await userApi.update(user.user_id, updateData);
        toast.success('User updated successfully');
      } else {
        await userApi.register(formData as UserCreate);
        toast.success('User registered successfully');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-background/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading uppercase tracking-tight">
                {isEdit ? 'Edit User' : 'Register New User'}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                {isEdit ? `Updating profile for ${user.username}` : 'Create a new system user account'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity Group */}
            <div className="col-span-full">
              <h3 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <UserCircle className="w-3 h-3" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">First Name</label>
                  <input
                    required
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-medium"
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Middle Name</label>
                  <input
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleChange}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-medium"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Last Name</label>
                  <input
                    required
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-medium"
                    placeholder="Enter last name"
                  />
                </div>
              </div>
            </div>

            {/* Account Group */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield className="w-3 h-3" />
                Account Credentials
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Username</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      required
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full h-11 pl-11 pr-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-medium"
                      placeholder="username123"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                    Password {isEdit && <span className="text-[9px] lowercase italic text-amber-500">(leave blank to keep current)</span>}
                  </label>
                  <input
                    required={!isEdit}
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full h-11 px-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Contact Group */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Mail className="w-3 h-3" />
                Contact & ID
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full h-11 pl-11 pr-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-medium"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Contact No.</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        name="contact_number"
                        value={formData.contact_number}
                        onChange={handleChange}
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-medium"
                        placeholder="0912..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Employee ID</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        name="employee_id"
                        value={formData.employee_id}
                        onChange={handleChange}
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-medium"
                        placeholder="EMP-001"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Group */}
            <div className="col-span-full">
              <h3 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield className="w-3 h-3" />
                System Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">System Role</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <select
                      required
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      disabled={configsLoading}
                      className="w-full h-11 pl-11 pr-10 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-bold appearance-none disabled:opacity-50"
                    >
                      <option value="" disabled>Select Role</option>
                      {roles.map(r => (
                        <option key={r.key} value={r.key}>{r.value} ({r.key})</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      {configsLoading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Shield className="w-4 h-4 text-muted-foreground opacity-20" />}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Shift Assignment</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <select
                      required
                      name="shift_type"
                      value={formData.shift_type}
                      onChange={handleChange}
                      disabled={configsLoading}
                      className="w-full h-11 pl-11 pr-10 rounded-xl bg-input/30 border border-border focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-bold appearance-none disabled:opacity-50"
                    >
                      {shifts.map(s => (
                        <option key={s.key} value={s.key}>{s.value}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                     {configsLoading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Clock className="w-4 h-4 text-muted-foreground opacity-20" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl border border-border font-bold text-sm hover:bg-muted/50 transition-all uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || configsLoading}
              className="flex-1 h-12 rounded-2xl bg-indigo-500 text-indigo-50 text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEdit ? 'Update Profile' : 'Register User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
