import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Phones on the same Wi-Fi reach `next dev` by LAN IP, not localhost. Without this the dev
   * server blocks `/_next/*` as cross-origin, the client bundle never loads, and the form falls
   * back to a native submit that drops the birth data.
   */
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.16.*.*'],
  /** The city list is read from disk at runtime, which the bundler cannot see on its own. */
  outputFileTracingIncludes: {
    '/api/places': ['./data/cities.json'],
  },
  /** The poster invitation is a static page in `public/invite/`; serve it at `/invite` too. */
  async rewrites() {
    return [{ source: '/invite', destination: '/invite/index.html' }];
  },
};

export default nextConfig;
