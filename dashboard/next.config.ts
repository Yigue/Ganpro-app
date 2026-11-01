import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // El repo raíz es la app Expo y tiene su propio lockfile.
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
};

export default nextConfig;
