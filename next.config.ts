import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Give server actions and route handlers up to 30s (Vercel Hobby max)
    serverActionsBodySizeLimit: "2mb",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "**.tiktokcdn-us.com" },
      { protocol: "https", hostname: "**.tiktokv.com" },
      { protocol: "https", hostname: "tikwm.com" },
      { protocol: "https", hostname: "**.tikwm.com" },
      { protocol: "https", hostname: "**.muscdn.com" },
      { protocol: "https", hostname: "**.byteoversea.com" },
    ],
  },
};

export default nextConfig;
