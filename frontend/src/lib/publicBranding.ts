'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface PublicBrandingData {
  visual_identity: {
    brand_name: string;
    system_theme: string;
    logo_url: string | null;
    favicon_url: string | null;
  };
}

const DEFAULT_BRAND_NAME = 'Lendr';
const BRANDING_QUERY_KEY = ['public', 'branding'] as const;

function normalizeBrandName(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || DEFAULT_BRAND_NAME;
}

export function resolveBrandAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (normalizedPath.startsWith('/api/')) {
    return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
  }

  if (typeof window !== 'undefined') {
    return normalizedPath;
  }

  return `${baseUrl || 'http://localhost:8000'}${normalizedPath}`;
}

export function usePublicBranding() {
  const query = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: () => api.get<PublicBrandingData>('/admin/settings/branding'),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const branding = query.data?.data;
  const brandName = normalizeBrandName(branding?.visual_identity?.brand_name);
  const logoUrl = resolveBrandAssetUrl(branding?.visual_identity?.logo_url);
  const faviconUrl = resolveBrandAssetUrl(branding?.visual_identity?.favicon_url);

  return {
    ...query,
    brandName,
    logoUrl,
    faviconUrl,
  };
}
