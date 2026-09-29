import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.15.9'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev', 
      },
      {
        protocol: 'https',
        hostname: '*.cloudflarestorage.com',
      }
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/doc/:path*',
        destination: '/dashboard/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
