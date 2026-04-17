import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}));

vi.mock('@/lib/http', async () => {
  const actual = await vi.importActual<typeof import('@/lib/http')>('@/lib/http');

  return {
    ...actual,
    http: {
      ...actual.http,
      request: mocks.mockRequest,
    },
  };
});

import { api } from '@/lib/api';
import { HttpRequestError } from '@/lib/http';

describe('api.rotateFirstLoginPassword', () => {
  beforeEach(() => {
    mocks.mockRequest.mockReset();
  });

  it('normalizes backend endpoints that include /api prefix', async () => {
    mocks.mockRequest.mockResolvedValue({ status: 'success' });

    await api.rotateFirstLoginPassword(
      {
        username: 'admin',
        current_password: 'old-secret',
        new_password: 'new-secret',
      },
      '/api/auth/first-login/rotate-password',
    );

    expect(mocks.mockRequest).toHaveBeenCalledTimes(1);
    expect(mocks.mockRequest).toHaveBeenCalledWith('/auth/first-login/rotate-password', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        current_password: 'old-secret',
        new_password: 'new-secret',
      }),
    });
  });

  it('does not retry legacy bootstrap alias when first-login endpoint fails', async () => {
    mocks.mockRequest.mockRejectedValueOnce(new HttpRequestError(404, 'Not found'));

    await expect(
      api.rotateFirstLoginPassword(
        {
          username: 'admin',
          current_password: 'old-secret',
          new_password: 'new-secret',
        },
        '/auth/first-login/rotate-password',
      ),
    ).rejects.toMatchObject({
      name: 'AuthApiError',
      status: 404,
    });

    expect(mocks.mockRequest).toHaveBeenCalledTimes(1);
    expect(mocks.mockRequest).toHaveBeenCalledWith('/auth/first-login/rotate-password', expect.any(Object));
  });
});
