import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const defaultApiOrigin = "http://localhost:8000";

function toOrigin(value: string | undefined, fallback?: string): string {
  const candidate = value?.trim() || fallback || "";
  try {
    return new URL(candidate).origin;
  } catch {
    return new URL(defaultApiOrigin).origin;
  }
}

const apiOrigin = toOrigin(process.env.NEXT_PUBLIC_API_URL, defaultApiOrigin);

const connectSrc = ["'self'", apiOrigin, "https://fastly.jsdelivr.net"];
const imgSrc = ["'self'", "data:", "blob:", apiOrigin];

if (isDevelopment) {
  connectSrc.push("ws://localhost:3000", "ws://127.0.0.1:3000", "ws://192.168.100.104:3000", "ws:");
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "media-src 'self' data: blob:",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imgSrc.join(" ")}`,
  "font-src 'self' data:",
  `connect-src ${connectSrc.join(" ")}`,
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // @ts-ignore - explicitly required by Next.js dev server for cross-origin LAN access
  allowedDevOrigins: ["192.168.100.104"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=*, microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
