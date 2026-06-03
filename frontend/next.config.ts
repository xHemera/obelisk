import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
  ],
};

export default nextConfig;
