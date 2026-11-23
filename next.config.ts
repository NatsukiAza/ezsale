import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "radix-ui", "recharts", "motion"],
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
  async redirects() {
    return [
      { source: "/sales", destination: "/reports", permanent: true },
      { source: "/sales/:path*", destination: "/reports", permanent: true },
    ];
  },
};

export default nextConfig;
