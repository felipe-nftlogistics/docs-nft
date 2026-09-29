import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.15.9'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev', // Para o domínio padrão do R2 (pub-...)
      },
      {
        protocol: 'https',
        hostname: '*.cloudflarestorage.com',
      }
      // Você pode adicionar seu domínio customizado aqui depois
    ],
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
