import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Provide build-time shims to avoid network installs in restricted envs
      "@google/generative-ai": path.resolve(__dirname, "shims/google-generative-ai.ts"),
    };
    return config;
  },
};

export default nextConfig;
