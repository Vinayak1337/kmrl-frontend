import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Provide build-time shims to avoid network installs in restricted envs
      // Note: Do NOT alias `bcryptjs` here. A previous alias caused a
      // self-referential import (the shim imported `bcryptjs` again),
      // which broke `bcrypt.compare` in production bundles.
      "@google/generative-ai": path.resolve(__dirname, "shims/google-generative-ai.ts"),
    };
    return config;
  },
};

export default nextConfig;
