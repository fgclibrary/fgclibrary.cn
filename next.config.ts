import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next"
import { siteModules } from "./lib/site-config"

const nextConfig: NextConfig = {
  // Next 16.1+ 默认启用 Turbopack 的文件系统缓存（beta）。
  // 该缓存把编译状态持久化到 .next/dev，状态不完整时恢复会陷入重编译死循环，
  // 表现为 dev 启动后无请求 CPU 也冲到 700%+。开发阶段关闭它以换取稳定。
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
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
