const SERVER_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function buildApiRequestUrl(url: string): string {
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  const baseUrl = typeof window !== 'undefined' ? '' : SERVER_API_BASE_URL;

  return `${baseUrl}/api${normalizedPath}`;
}