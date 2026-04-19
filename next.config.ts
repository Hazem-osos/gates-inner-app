import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Prevent Turbopack/Webpack from touching Prisma’s native query engine (avoids corrupt dylib / dlopen errors)
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
