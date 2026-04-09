import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveBrandAssetUrl } from '@/lib/publicBranding';

describe('resolveBrandAssetUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns relative path in browser context', () => {
    expect(resolveBrandAssetUrl('uploads/logo.png')).toBe('/uploads/logo.png');
    expect(resolveBrandAssetUrl('/uploads/logo.png')).toBe('/uploads/logo.png');
  });

  it('returns absolute API base fallback in server context', () => {
    const originalBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = 'http://api.example.test';
    vi.stubGlobal('window', undefined);

    expect(resolveBrandAssetUrl('/uploads/logo.png')).toBe('http://api.example.test/uploads/logo.png');

    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalBaseUrl;
    }
  });

  it('keeps fully-qualified URLs unchanged', () => {
    expect(resolveBrandAssetUrl('https://cdn.example.test/logo.png')).toBe('https://cdn.example.test/logo.png');
  });
});
