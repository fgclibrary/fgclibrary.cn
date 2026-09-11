import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // 纯静态导出：产物为 out/ 下的 HTML 与静态资源，运行时无需 Node 服务。
  // 静态导出不支持 redirects，原先 `/docs/<module> -> /<module>` 的跳转
  // 改由部署侧（nginx）承担，规则与部署步骤见 DEPLOYMENT.md。
  output: "export",
}

const withMDX = createMDX()

export default withMDX(nextConfig)
