import type { NextConfig } from "next";

const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  typescript: {
    // Keep local builds unblocked, but fail fast on CI.
    ignoreBuildErrors: !isCI,
  },

  eslint: {
    // Keep local builds unblocked, but fail fast on CI.
    ignoreDuringBuilds: !isCI,
  },
};

export default nextConfig;
