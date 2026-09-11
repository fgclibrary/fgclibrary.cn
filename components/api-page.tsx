"use client"

import { createOpenAPIPage } from "fumadocs-openapi/ui"

// 站点为纯静态导出，没有服务端代理可转发试调请求，
// 因此关闭 playground，仅保留接口文档展示。
export const APIPage = createOpenAPIPage({
  playground: { enabled: false },
})
