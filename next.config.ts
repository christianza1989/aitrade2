import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable static generation for pages that require database connections
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // Disable static optimization for dashboard pages
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
};

export default nextConfig;
