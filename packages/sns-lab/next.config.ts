import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["@neondatabase/serverless"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
}

export default nextConfig
