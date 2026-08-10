import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next"
import { siteModules } from "./lib/site-config"

const nextConfig: NextConfig = {
  async redirects() {
    return siteModules.map((module) => ({
      source: `/docs/${module.id}`,
      destination: module.href,
      permanent: false,
    }))
  },
}

const withMDX = createMDX()

export default withMDX(nextConfig)
