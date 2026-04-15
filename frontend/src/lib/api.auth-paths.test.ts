import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('./http', () => {
  class MockHttpRequestError extends Error {
    status: number;
    payload: Record<string, unknown>;

    constructor(status: number, message: string, payload: Record<string, unknown> = {}) {
      super(message);
      this.name = 'HttpRequestError';
      this.status = status;
      this.payload = payload;
    }
  }

  return {
    http: {
      request: requestMock,
    },
    HttpRequestError: MockHttpRequestError,
    MaintenanceError: class MockMaintenanceError extends Error {},
    getDeviceId: vi.fn(),
  };
});

import { api } from './api';

describe('auth login paths', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      status: 'success',
      data: {
        access_token: 'token-value',
        token_type: 'bearer',
      },
    });
  });

  it('uses /auth/login for api.login', async () => {
    await api.login({ username: 'employee1', password: '123456' });

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );

    const call = requestMock.mock.calls[0] as [string, RequestInit];
    const body = call[1].body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('username')).toBe('employee1');
    expect((body as FormData).get('password')).toBe('123456');
  });

  it('routes borrowerLogin through standard login wrapper and /auth/login', async () => {
    await api.borrowerLogin({ username: 'employee2', password: '654321' });

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );

    const call = requestMock.mock.calls[0] as [string, RequestInit];
    const body = call[1].body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('username')).toBe('employee2');
    expect((body as FormData).get('password')).toBe('654321');
  });
});
