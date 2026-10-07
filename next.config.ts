import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Prevent Turbopack/Webpack from touching Prisma’s native query engine (avoids corrupt dylib / dlopen errors)
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
      "@radix-ui/react-select",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
