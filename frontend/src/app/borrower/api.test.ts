import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');

  return {
    ...actual,
    api: {
      ...actual.api,
      get: mocks.mockGet,
    },
  };
});

import { borrowerApi } from './api';

describe('borrowerApi.listRequestHistory', () => {
  beforeEach(() => {
    mocks.mockGet.mockReset();
  });

  it('builds query string for list filters', async () => {
    mocks.mockGet.mockResolvedValue({ data: [] });

    await borrowerApi.listRequestHistory({
      page: 2,
      per_page: 15,
      status: 'closed',
    });

    expect(mocks.mockGet).toHaveBeenCalledWith(
      '/inventory/borrower/requests?page=2&per_page=15&status=closed',
    );
  });

  it('calls base endpoint when no filters are provided', async () => {
    mocks.mockGet.mockResolvedValue({ data: [] });

    await borrowerApi.listRequestHistory();

    expect(mocks.mockGet).toHaveBeenCalledWith('/inventory/borrower/requests');
  });
});
