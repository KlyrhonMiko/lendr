'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  Key,
  Clock,
  Users,
  Calendar,
  Edit2,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import type { SecuritySettingsData, SecurityShiftDefinition } from '../api';
import {
  type RbacOverviewRow,
  useSecuritySettingsMutations,
  useSecuritySettingsViewData,
} from '../lib/useSettingsQueries';

type ShiftDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const SHIFT_DAYS: Array<{ value: ShiftDay; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const DEFAULT_SHIFT_DAYS: ShiftDay[] = [1, 2, 3, 4, 5];

function formatRoleLabel(role: string): string {
  return role
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatShiftTime(time: string): string {
  const [hourRaw, minuteRaw] = time.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return time;
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

function normalizeRoleList(roles: string[]): string[] {
  return [...new Set(roles.map((role) => role.trim().toLowerCase()).filter(Boolean))];
}

function normalizeShiftDays(days: number[]): ShiftDay[] {
  return [...new Set(days)]
    .filter((day): day is ShiftDay => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((left, right) => left - right);
}

function getPermissionSummary(row: RbacOverviewRow): string {
  if (row.permissions.includes('*')) {
    return 'Full Access';
  }

  if (!row.permissions.length) {
    return 'No explicit permissions configured';
  }

  if (row.permissions.length <= 3) {
    return row.permissions.join(', ');
  }

  return `${row.permissions.slice(0, 3).join(', ')} +${row.permissions.length - 3} more`;
}

function normalizeSecurityPayload(payload: SecuritySettingsData): SecuritySettingsData {
  const shiftDefinitions = payload.shift_definitions.definitions
    .map((definition) => ({
      key: definition.key.trim().toLowerCase(),
      label: definition.label.trim() || formatRoleLabel(definition.key),
      start: definition.start,
      end: definition.end,
      days: normalizeShiftDays(definition.days),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));

  return {
    ...payload,
    two_factor: {
      ...payload.two_factor,
      method: 'authenticator_app',
      enforce_on: 'next_login',
      enforce_for_roles: normalizeRoleList(payload.two_factor.enforce_for_roles),
    },
    password_rules: {
      ...payload.password_rules,
      applies_when_role_not_in: normalizeRoleList(payload.password_rules.applies_when_role_not_in),
    },
    session_timeout: {
      inactive_minutes: Math.max(5, payload.session_timeout.inactive_minutes),
      warning_minutes: Math.max(
        1,
        Math.min(payload.session_timeout.warning_minutes, payload.session_timeout.inactive_minutes - 1),
      ),
    },
    shift_definitions: {
      ...payload.shift_definitions,
      values: shiftDefinitions.map((definition) => definition.key),
      definitions: shiftDefinitions,
    },
  };
}

function toComparablePayload(payload: SecuritySettingsData): string {
  return JSON.stringify(normalizeSecurityPayload(payload));
}

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function SecuritySettings() {
  const [draft, setDraft] = useState<SecuritySettingsData | null>(null);
  const [editingShiftKey, setEditingShiftKey] = useState<string | null>(null);

  const {
    data: securityViewData,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useSecuritySettingsViewData();

  const { saveSecuritySettings } = useSecuritySettingsMutations();

  useEffect(() => {
    if (!securityViewData) {
      return;
    }

    setDraft(normalizeSecurityPayload(securityViewData.security));
    setEditingShiftKey(null);
  }, [securityViewData]);

  const hasChanges = useMemo(() => {
    if (!draft || !securityViewData) {
      return false;
    }

    return toComparablePayload(draft) !== toComparablePayload(securityViewData.security);
  }, [draft, securityViewData]);

  const roleOptions = securityViewData?.rbacRows.length
    ? securityViewData.rbacRows.map((row) => ({
      role: row.role,
      label: row.displayName,
    }))
    : (draft?.two_factor.enforce_for_roles ?? []).map((role) => ({
      role,
      label: formatRoleLabel(role),
    }));

  const rbacRows = securityViewData?.rbacRows ?? [];
  const excludedRoles = draft?.password_rules.applies_when_role_not_in ?? [];
  const shiftDrafts = draft?.shift_definitions.definitions ?? [];
  const isSaving = saveSecuritySettings.isPending;

  const updateDraft = (updater: (current: SecuritySettingsData) => SecuritySettingsData) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const toggleTwoFactorRole = (role: string) => {
    const normalizedRole = role.trim().toLowerCase();

    updateDraft((current) => {
      const alreadyEnabled = current.two_factor.enforce_for_roles.includes(normalizedRole);

      if (alreadyEnabled && current.two_factor.enforce_for_roles.length === 1) {
        toast.info('At least one role must remain covered by 2FA');
        return current;
      }

      const enforceForRoles = alreadyEnabled
        ? current.two_factor.enforce_for_roles.filter((entry) => entry !== normalizedRole)
        : [...current.two_factor.enforce_for_roles, normalizedRole];

      return {
        ...current,
        two_factor: {
          ...current.two_factor,
          method: 'authenticator_app',
          enforce_on: 'next_login',
          enforce_for_roles: normalizeRoleList(enforceForRoles),
        },
      };
    });
  };

  const updateShiftDefinition = (
    key: string,
    updater: (definition: SecurityShiftDefinition) => SecurityShiftDefinition,
  ) => {
    updateDraft((current) => {
      const definitions = current.shift_definitions.definitions.map((definition) =>
        definition.key === key ? updater(definition) : definition,
      );

      return {
        ...current,
        shift_definitions: {
          ...current.shift_definitions,
          values: definitions.map((definition) => definition.key),
          definitions,
        },
      };
    });
  };

  const toggleShiftDay = (key: string, day: ShiftDay) => {
    updateShiftDefinition(key, (definition) => {
      const hasDay = definition.days.includes(day);
      const nextDays = hasDay
        ? definition.days.filter((entry) => entry !== day)
        : [...definition.days, day];

      const normalizedDays = normalizeShiftDays(nextDays);
      return {
        ...definition,
        days: normalizedDays.length ? normalizedDays : DEFAULT_SHIFT_DAYS,
      };
    });
  };

  const handleRefresh = async () => {
    const result = await refetch();
    if (result.error) {
      toast.error('Unable to refresh security settings right now');
      return;
    }
    toast.success('Security settings refreshed');
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    if (!hasChanges) {
      toast.info('No security changes to save');
      return;
    }

    await saveSecuritySettings.mutateAsync(normalizeSecurityPayload(draft));
    setEditingShiftKey(null);
    await refetch();
  };

  if (isLoading && !draft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security & Access</CardTitle>
          <CardDescription>Loading security settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error && !draft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security & Access</CardTitle>
          <CardDescription>Unable to load security settings right now.</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!draft) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {error && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-700">
          Showing cached security data while refreshing failed.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
              <CardDescription>
                Authenticator app verification is enforced on next login for selected roles.
              </CardDescription>
            </div>
            <Toggle
              checked={draft.two_factor.enabled}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  two_factor: {
                    ...current.two_factor,
                    enabled: event.target.checked,
                  },
                }))
              }
              disabled={isSaving}
            />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground px-1">Require 2FA for roles:</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {roleOptions.map((role) => (
                  <label
                    key={role.role}
                    className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={draft.two_factor.enforce_for_roles.includes(role.role)}
                      onChange={() => toggleTwoFactorRole(role.role)}
                      className="w-4 h-4 rounded border-border text-indigo-500 focus:ring-indigo-500"
                      disabled={isSaving}
                    />
                    <span className="text-sm font-medium">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Select
              label="2FA Method"
              value="authenticator_app"
              onChange={() => undefined}
              options={[{ label: 'Authenticator App', value: 'authenticator_app' }]}
              disabled
            />

            <p className="text-xs text-muted-foreground">
              Authenticator app is the only supported method for this deployment.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Key className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Password Rules</CardTitle>
              <CardDescription>Configure complexity requirements for admin-side accounts.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Minimum Length"
                type="number"
                min={6}
                max={128}
                value={draft.password_rules.min_length}
                onChange={(event) => {
                  const value = Math.min(128, Math.max(6, parsePositiveInt(event.target.value, 6)));
                  updateDraft((current) => ({
                    ...current,
                    password_rules: {
                      ...current.password_rules,
                      min_length: value,
                    },
                  }));
                }}
                disabled={isSaving}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="Require Uppercase"
                checked={draft.password_rules.require_uppercase}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    password_rules: {
                      ...current.password_rules,
                      require_uppercase: event.target.checked,
                    },
                  }))
                }
                disabled={isSaving}
              />
              <Toggle
                label="Require Lowercase"
                checked={draft.password_rules.require_lowercase}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    password_rules: {
                      ...current.password_rules,
                      require_lowercase: event.target.checked,
                    },
                  }))
                }
                disabled={isSaving}
              />
              <Toggle
                label="Require Number"
                checked={draft.password_rules.require_number}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    password_rules: {
                      ...current.password_rules,
                      require_number: event.target.checked,
                    },
                  }))
                }
                disabled={isSaving}
              />
              <Toggle
                label="Require Special Character"
                checked={draft.password_rules.require_special}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    password_rules: {
                      ...current.password_rules,
                      require_special: event.target.checked,
                    },
                  }))
                }
                disabled={isSaving}
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-sm text-muted-foreground">
                Password rules are enforced only for non borrower/dispatch roles.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {excludedRoles.map((role) => (
                  <span key={role} className="px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground">
                    {formatRoleLabel(role)}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <CardTitle>Session Timeout</CardTitle>
            <CardDescription>
              Configure inactivity auto-logout and warning windows used across authenticated screens.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <Input
            label="Auto-logout After (minutes)"
            type="number"
            min={5}
            max={1440}
            value={draft.session_timeout.inactive_minutes}
            onChange={(event) => {
              const inactiveMinutes = Math.min(
                1440,
                Math.max(5, parsePositiveInt(event.target.value, draft.session_timeout.inactive_minutes)),
              );

              updateDraft((current) => ({
                ...current,
                session_timeout: {
                  inactive_minutes: inactiveMinutes,
                  warning_minutes: Math.min(current.session_timeout.warning_minutes, inactiveMinutes - 1),
                },
              }));
            }}
            disabled={isSaving}
          />

          <Input
            label="Warn Before Timeout (minutes)"
            type="number"
            min={1}
            max={60}
            value={draft.session_timeout.warning_minutes}
            onChange={(event) => {
              const warningMinutes = Math.min(
                60,
                Math.max(1, parsePositiveInt(event.target.value, draft.session_timeout.warning_minutes)),
              );

              updateDraft((current) => ({
                ...current,
                session_timeout: {
                  ...current.session_timeout,
                  warning_minutes: Math.min(warningMinutes, current.session_timeout.inactive_minutes - 1),
                },
              }));
            }}
            disabled={isSaving}
          />
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <CardTitle>RBAC Overview</CardTitle>
              <CardDescription>Live role definitions, permissions, and user counts from backend settings.</CardDescription>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="text-xs font-bold text-primary hover:underline disabled:opacity-60"
              disabled={isRefetching || isSaving}
            >
              {isRefetching ? 'Refreshing...' : 'Refresh'}
            </button>
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
                {rbacRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-sm text-muted-foreground">
                      No role definitions found in backend security payload.
                    </td>
                  </tr>
                ) : (
                  rbacRows.map((role) => (
                    <tr key={role.role} className="hover:bg-muted/10">
                      <td className="px-6 py-4 font-bold">{role.displayName}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{getPermissionSummary(role)}</td>
                      <td className="px-6 py-4 text-right">{role.userCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle>Shift Definitions</CardTitle>
              <CardDescription>Persisted shift labels and schedules from security settings.</CardDescription>
            </div>
            <button
              type="button"
              aria-label="Refresh shift definitions"
              onClick={handleRefresh}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
              disabled={isRefetching || isSaving}
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </CardHeader>
          <CardContent className="p-0 border-t border-border flex-1">
            <div className="divide-y divide-border/50">
              {shiftDrafts.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No shift definitions available.</div>
              ) : (
                shiftDrafts.map((shift) => {
                  const isEditing = editingShiftKey === shift.key;

                  return (
                    <div key={shift.key} className="p-6 flex items-start gap-6 hover:bg-muted/10 transition-colors">
                      <div className="flex-1 space-y-3">
                        {isEditing ? (
                          <>
                            <Input
                              label="Shift Name"
                              value={shift.label}
                              onChange={(event) =>
                                updateShiftDefinition(shift.key, (definition) => ({
                                  ...definition,
                                  label: event.target.value,
                                }))
                              }
                              disabled={isSaving}
                            />

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <Input
                                label="Start"
                                type="time"
                                value={shift.start}
                                onChange={(event) =>
                                  updateShiftDefinition(shift.key, (definition) => ({
                                    ...definition,
                                    start: event.target.value,
                                  }))
                                }
                                disabled={isSaving}
                              />
                              <Input
                                label="End"
                                type="time"
                                value={shift.end}
                                onChange={(event) =>
                                  updateShiftDefinition(shift.key, (definition) => ({
                                    ...definition,
                                    end: event.target.value,
                                  }))
                                }
                                disabled={isSaving}
                              />
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {SHIFT_DAYS.map((day) => {
                                const isActive = shift.days.includes(day.value);
                                return (
                                  <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleShiftDay(shift.key, day.value)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${isActive
                                      ? 'bg-primary text-primary-foreground border-primary/20'
                                      : 'bg-secondary/50 text-muted-foreground border-border/50'
                                      }`}
                                    disabled={isSaving}
                                  >
                                    {day.label}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <>
                            <h4 className="font-bold mb-1">{shift.label}</h4>
                            <div className="flex gap-4 text-xs text-muted-foreground mb-3 font-mono">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {formatShiftTime(shift.start)} - {formatShiftTime(shift.end)}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {shift.days.length} Days
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {SHIFT_DAYS.map((day) => (
                                <span
                                  key={day.value}
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold border ${shift.days.includes(day.value)
                                    ? 'bg-primary text-primary-foreground border-primary/20'
                                    : 'bg-secondary/50 text-muted-foreground border-border/50'
                                    }`}
                                >
                                  {day.label}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          aria-label={`Edit ${shift.label} shift`}
                          onClick={() => setEditingShiftKey(isEditing ? null : shift.key)}
                          className="p-2 hover:bg-muted rounded-lg border border-border"
                          disabled={isSaving}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving security settings...' : 'Save Security Settings'}
        </button>
      </div>
    </div>
  );
}
