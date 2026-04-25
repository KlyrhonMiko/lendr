import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('lucide-react', () => {
  const Icon = () => <svg aria-hidden="true" />;

  return {
    X: Icon,
    Loader2: Icon,
    Mail: Icon,
    Shield: Icon,
    Clock: Icon,
    Hash: Icon,
    Phone: Icon,
    UserCircle: Icon,
    KeyRound: Icon,
    RotateCcwKey: Icon,
    Smartphone: Icon,
  };
});

const mockUserApi = vi.hoisted(() => ({
  getConfigs: vi.fn(),
  getSecuritySettings: vi.fn(),
  update: vi.fn(),
  register: vi.fn(),
  resetTwoFactor: vi.fn(),
  getTwoFactorStatus: vi.fn(),
  getSecondaryPassword: vi.fn(),
  resetLoginPassword: vi.fn(),
}));

vi.mock('./api', () => ({
  userApi: mockUserApi,
  User: {},
  UserCreate: {},
  UserUpdate: {},
  AuthConfig: {},
}));

vi.mock('@/components/ui/form-select', () => ({
  FormSelect: ({
    label,
    value,
    onChange,
    options,
    disabled,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ key: string; label: string }>;
    disabled?: boolean;
  }) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

import { UserModal } from './UserModal';

type TestUser = {
  user_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  shift_type: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

function buildUser(role: string): TestUser {
  return {
    user_id: 'USER-001',
    username: 'user001',
    email: 'user001@example.com',
    first_name: 'Test',
    last_name: 'User',
    role,
    shift_type: 'day',
    is_deleted: false,
    created_at: '2026-04-16T00:00:00.000Z',
    updated_at: '2026-04-16T00:00:00.000Z',
  };
}

describe('UserModal borrower action gating', () => {
  beforeEach(() => {
    mockUserApi.getConfigs.mockReset();
    mockUserApi.getSecuritySettings.mockReset();
    mockUserApi.update.mockReset();
    mockUserApi.register.mockReset();
    mockUserApi.resetTwoFactor.mockReset();
    mockUserApi.getTwoFactorStatus.mockReset();
    mockUserApi.getSecondaryPassword.mockReset();
    mockUserApi.resetLoginPassword.mockReset();

    mockUserApi.getTwoFactorStatus.mockResolvedValue({
      data: {
        enabled: true,
        method: 'authenticator_app',
        enrolled_at: '2026-04-16T00:00:00.000Z',
      },
    });

    mockUserApi.getConfigs.mockImplementation(async (category: string) => {
      if (category === 'users_role') {
        return {
          data: [
            { id: 'role-1', key: 'borrower', value: 'Borrower', category: 'users_role' },
            { id: 'role-2', key: 'staff', value: 'Staff', category: 'users_role' },
            { id: 'role-4', key: 'borrow', value: 'Borrow', category: 'users_role' },
            { id: 'role-3', key: 'brwr', value: 'Borrower (Short)', category: 'users_role' },
          ],
        };
      }

      return {
        data: [{ id: 'shift-1', key: 'day', value: 'Day', category: 'users_shift_type' }],
      };
    });

    mockUserApi.getSecuritySettings.mockResolvedValue({
      data: {
        password_rules: {
          min_length: 6,
        },
      },
    });
  });

  it('disables recovery and reset-login-password actions for borrower role', async () => {
    render(
      <UserModal
        user={buildUser('borrower')}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onCredentialReveal={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mockUserApi.getConfigs).toHaveBeenCalledWith('users_role');
    });

    expect(screen.getByRole('button', { name: 'View Secondary Password' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset Login Password' })).toBeDisabled();
    expect(mockUserApi.getTwoFactorStatus).toHaveBeenCalledWith('USER-001');
  });

  it('disables recovery and reset-login-password actions for borrower short-code role', async () => {
    render(
      <UserModal
        user={buildUser('brwr')}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onCredentialReveal={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mockUserApi.getConfigs).toHaveBeenCalledWith('users_role');
    });

    expect(screen.getByRole('button', { name: 'View Secondary Password' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset Login Password' })).toBeDisabled();
  });

  it('disables recovery and reset-login-password actions for borrow alias role', async () => {
    render(
      <UserModal
        user={buildUser('borrow')}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onCredentialReveal={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mockUserApi.getConfigs).toHaveBeenCalledWith('users_role');
    });

    expect(screen.getByRole('button', { name: 'View Secondary Password' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset Login Password' })).toBeDisabled();
  });

  it('keeps recovery and reset-login-password actions enabled for non-borrower roles', async () => {
    render(
      <UserModal
        user={buildUser('staff')}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onCredentialReveal={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mockUserApi.getConfigs).toHaveBeenCalledWith('users_role');
    });

    expect(screen.getByRole('button', { name: 'View Secondary Password' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reset Login Password' })).toBeEnabled();
    expect(screen.queryByText(/Unavailable for borrower accounts/i)).not.toBeInTheDocument();
  });

  it('saves edit changes without requiring password', async () => {
    const onSuccess = vi.fn();
    mockUserApi.update.mockResolvedValue({ data: buildUser('staff') });

    render(
      <UserModal
        user={buildUser('staff')}
        onClose={vi.fn()}
        onSuccess={onSuccess}
        onCredentialReveal={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mockUserApi.getConfigs).toHaveBeenCalledWith('users_role');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUserApi.update).toHaveBeenCalledTimes(1);
    });

    const [, payload] = mockUserApi.update.mock.calls[0];
    expect(payload.password).toBeUndefined();
    expect(payload.change_password).toBeUndefined();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('only sends password changes after explicit enablement in edit mode', async () => {
    mockUserApi.update.mockResolvedValue({ data: buildUser('staff') });

    render(
      <UserModal
        user={buildUser('staff')}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onCredentialReveal={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mockUserApi.getConfigs).toHaveBeenCalledWith('users_role');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enable Password Change' }));
    fireEvent.change(screen.getByPlaceholderText('Enter new password'), {
      target: { value: 'UpdatedPass!123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUserApi.update).toHaveBeenCalledTimes(1);
    });

    const [, payload] = mockUserApi.update.mock.calls[0];
    expect(payload.password).toBe('UpdatedPass!123');
    expect(payload.change_password).toBe(true);
  });
});
