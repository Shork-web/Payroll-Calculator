import path from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: appRoot,
  serverExternalPackages: ["xlsx-js-style"],
  /**
   * Avoid Webpack PackFileCacheStrategy ENOENT on Windows when `.next/cache`
   * is missing, partially deleted, or locked (e.g. antivirus). Dev uses in-memory
   * cache instead of `.next/cache/webpack/*.pack.gz`.
   */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" }
    }
    return config
  },
}

export default nextConfig
