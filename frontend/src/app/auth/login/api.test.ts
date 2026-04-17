import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockVerifyLoginTwoFactor: vi.fn(),
  mockRotateFirstLoginPassword: vi.fn(),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');

  return {
    ...actual,
    api: {
      ...actual.api,
      login: mocks.mockLogin,
      verifyLoginTwoFactor: mocks.mockVerifyLoginTwoFactor,
      rotateFirstLoginPassword: mocks.mockRotateFirstLoginPassword,
    },
  };
});

import type { LoginResponse } from '@/lib/api';
import { loginApi } from './api';

const passwordChangeBranch: LoginResponse = {
  auth_state: 'password_change_required',
  code: 'AUTH.FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED',
  password_change_required: true,
  rotation_endpoint: '/api/auth/first-login/rotate-password',
};

describe('loginApi', () => {
  beforeEach(() => {
    mocks.mockLogin.mockReset();
    mocks.mockVerifyLoginTwoFactor.mockReset();
    mocks.mockRotateFirstLoginPassword.mockReset();
  });

  it('detects the structured password-change-required login branch', () => {
    expect(loginApi.isPasswordChangeRequired(passwordChangeBranch)).toBe(true);
    expect(loginApi.isTwoFactorChallenge(passwordChangeBranch)).toBe(false);
  });

  it('prefers the backend-provided rotation endpoint', () => {
    expect(loginApi.getRotationEndpoint(passwordChangeBranch)).toBe('/api/auth/first-login/rotate-password');
  });

  it('falls back to first-login default endpoint when backend omits endpoint value', () => {
    const defaultOnly = {
      ...passwordChangeBranch,
      rotation_endpoint: '',
    };

    expect(loginApi.getRotationEndpoint(defaultOnly)).toBe('/auth/first-login/rotate-password');
  });

  it('routes first-login password rotation through the generalized API call', async () => {
    mocks.mockRotateFirstLoginPassword.mockResolvedValue({ status: 'success' });

    const payload = {
      username: 'admin',
      current_password: 'old-secret',
      new_password: 'new-secret',
    };

    await loginApi.rotateFirstLoginPassword(
      payload,
      '/api/auth/first-login/rotate-password',
    );

    expect(mocks.mockRotateFirstLoginPassword).toHaveBeenCalledWith(
      payload,
      '/api/auth/first-login/rotate-password',
    );
  });
});
