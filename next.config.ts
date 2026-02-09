import type { NextConfig } from "next";

const projectRoot = process.cwd();

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    serverActions: {
      // Uploads in customer documents/privacy flow accept up to 20 MB files.
      // Keep headroom for multipart overhead to avoid 1 MB default runtime errors.
      bodySizeLimit: "24mb",
    },
  },
};

export default nextConfig;
