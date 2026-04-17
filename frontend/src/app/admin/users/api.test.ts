import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPatch: vi.fn(),
  mockDelete: vi.fn(),
  mockBuildQueryString: vi.fn(),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');

  return {
    ...actual,
    api: {
      ...actual.api,
      get: mocks.mockGet,
      post: mocks.mockPost,
      patch: mocks.mockPatch,
      delete: mocks.mockDelete,
    },
    buildQueryString: mocks.mockBuildQueryString,
  };
});

import { userApi } from './api';

describe('admin users api', () => {
  beforeEach(() => {
    mocks.mockGet.mockReset();
    mocks.mockPost.mockReset();
    mocks.mockPatch.mockReset();
    mocks.mockDelete.mockReset();
    mocks.mockBuildQueryString.mockReset();
    mocks.mockBuildQueryString.mockReturnValue('');
  });

  it('register posts to create endpoint and supports generated credentials response contract', async () => {
    mocks.mockPost.mockResolvedValue({
      status: 'success',
      data: {
        user: {
          user_id: 'USER-123',
        },
        generated_credentials: {
          one_time_login_password: 'TEMP-PASS-123',
          secondary_password: 'SECONDARY-123',
        },
      },
    });

    await userApi.register({
      username: 'emp001',
      email: 'user@example.com',
      first_name: 'User',
      last_name: 'Example',
      role: 'staff',
      shift_type: 'day',
    });

    expect(mocks.mockPost).toHaveBeenCalledWith('/admin/users/register', expect.any(Object));
  });

  it('calls secondary password endpoint with user id', async () => {
    mocks.mockGet.mockResolvedValue({ status: 'success', data: {} });

    await userApi.getSecondaryPassword('USER-001');

    expect(mocks.mockGet).toHaveBeenCalledWith('/admin/users/USER-001/secondary-password');
  });

  it('calls reset login password endpoint with user id and secondary password payload', async () => {
    mocks.mockPost.mockResolvedValue({ status: 'success', data: {} });

    await userApi.resetLoginPassword('USER-001', { secondary_password: 'SECONDARY-123' });

    expect(mocks.mockPost).toHaveBeenCalledWith('/admin/users/USER-001/reset-login-password', {
      secondary_password: 'SECONDARY-123',
    });
  });

  it('calls user 2FA status endpoint with user id', async () => {
    mocks.mockGet.mockResolvedValue({ status: 'success', data: {} });

    await userApi.getTwoFactorStatus('USER-001');

    expect(mocks.mockGet).toHaveBeenCalledWith('/admin/users/USER-001/2fa/status');
  });
});
