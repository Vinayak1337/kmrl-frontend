import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
  webpack: (config) => {
    config.resolve = config.resolve || {};
    return config;
  },
};

export default nextConfig;
