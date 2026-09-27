/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["@mui/material", "@mui/icons-material"],
  },
  /**
   * Use in-memory Webpack cache on ALL builds (dev + production) to avoid
   * ENOENT errors on Windows when antivirus or file watchers lock/delete
   * .next/cache/webpack/*.pack.gz or .nft.json trace files mid-build.
   */
  webpack: (config) => {
    config.cache = { type: "memory" }
    return config
  },
}

export default nextConfig

