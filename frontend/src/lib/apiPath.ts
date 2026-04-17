const SERVER_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function buildApiRequestUrl(url: string): string {
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  const baseUrl = typeof window !== 'undefined' ? '' : SERVER_API_BASE_URL;

  return `${baseUrl}/api${normalizedPath}`;
}

export function buildWebSocketUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // In the browser, mirror API requests and use same-origin (/api/*) so
  // websocket routing works across localhost, LAN dev hosts, and reverse proxies.
  if (typeof window !== 'undefined') {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${wsProtocol}://${window.location.host}/api${normalizedPath}`;
  }

  const serverOrigin = (() => {
    try {
      return new URL(SERVER_API_BASE_URL).origin;
    } catch {
      return 'http://localhost:8000';
    }
  })();

  const wsProtocol = serverOrigin.startsWith('https') ? 'wss' : 'ws';
  const wsBase = serverOrigin.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${wsBase}/api${normalizedPath}`;
}