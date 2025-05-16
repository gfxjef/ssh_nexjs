import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    domains: ['localhost'],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Normalizar referencias a jQuery para evitar conflictos de capitalización
    config.resolve.alias = {
      ...config.resolve.alias,
      jQuery: 'jquery', // Mapea jQuery (Q mayúscula) a jquery (minúscula)
    };
    return config;
  },
};

export default nextConfig;
