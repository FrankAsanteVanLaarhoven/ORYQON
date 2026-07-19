import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No framework identity header in responses.
  poweredByHeader: false,
  // Pin the workspace root to this monorepo (an unrelated lockfile exists
  // higher up the filesystem).
  turbopack: {
    root: path.join(__dirname, '..', '..'),
  },
};

export default nextConfig;
