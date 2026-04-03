import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { resolveBrandAssetUrl, usePublicBranding } from '@/lib/publicBranding';

const useQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
}));

describe('publicBranding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolveBrandAssetUrl returns absolute URL and keeps remote URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');

    expect(resolveBrandAssetUrl('/api/assets/branding/logo.png')).toBe(
      'https://api.example.com/api/assets/branding/logo.png',
    );
    expect(resolveBrandAssetUrl('api/assets/branding/logo.png')).toBe(
      'https://api.example.com/api/assets/branding/logo.png',
    );
    expect(resolveBrandAssetUrl('https://cdn.example.com/logo.png')).toBe(
      'https://cdn.example.com/logo.png',
    );
    expect(resolveBrandAssetUrl(null)).toBeNull();
  });

  it('usePublicBranding falls back to default brand name when API name is blank', () => {
    useQueryMock.mockReturnValue({
      data: {
        data: {
          visual_identity: {
            brand_name: '   ',
            system_theme: 'system',
            logo_url: null,
            favicon_url: null,
          },
        },
      },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => usePublicBranding());

    expect(result.current.brandName).toBe('Lendr');
    expect(result.current.logoUrl).toBeNull();
    expect(result.current.faviconUrl).toBeNull();
  });
});
