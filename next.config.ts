import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/sales", destination: "/reports", permanent: true },
      { source: "/sales/:path*", destination: "/reports", permanent: true },
    ];
  },
};

export default nextConfig;
