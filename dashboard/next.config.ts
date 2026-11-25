import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // El repo raíz es la app Expo y tiene su propio lockfile.
  outputFileTracingRoot: path.join(__dirname),
  // Compress build cache for disk-constrained CI/workspaces; application bundles are unchanged.
  webpack(config) {
    if(config.cache&&typeof config.cache==='object'&&config.cache.type==='filesystem')config.cache.compression='gzip';
    return config;
  },
  experimental: {
    serverActions: { bodySizeLimit: '6mb' },
  },
};

export default nextConfig;
