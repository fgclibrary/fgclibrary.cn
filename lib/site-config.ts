export type SiteModule = {
  id: "levels" | "solutions" | "standards" | "integrations" | "plugins"
  title: string
  shortTitle: string
  description: string
  href: string
  docsHref: string
  docsLabel: string
}

export type SiteAnnouncementConfig = {
  enabled: boolean
  label: string
  href: string
}

export const siteAnnouncement: SiteAnnouncementConfig = {
  enabled: true,
  label: "RBAC 权限框架已上线",
  href: "/docs/solutions/rbac",
}

export const siteModules: SiteModule[] = [
  {
    id: "levels",
    title: "能力地图",
    shortTitle: "能力地图",
    description: "定位当前能力阶段，找到从入门到企业级交付的下一步。",
    href: "/levels",
    docsHref: "/docs/levels",
    docsLabel: "查看 L1–L4 能力清单",
  },
  {
    id: "solutions",
    title: "解决方案",
    shortTitle: "解决方案",
    description: "把经过验证的应用能力直接带进新的活字格项目。",
    href: "/solutions",
    docsHref: "/docs/solutions/rbac",
    docsLabel: "进入 RBAC 权限框架",
  },
  {
    id: "standards",
    title: "标准化",
    shortTitle: "标准化",
    description: "将架构、开发与运维经验沉淀为可执行的项目建议。",
    href: "/standards",
    docsHref: "/docs/standards",
    docsLabel: "阅读标准化最佳实践",
  },
  {
    id: "integrations",
    title: "产品集成",
    shortTitle: "产品集成",
    description: "让活字格与 SpreadJS 等产品和外部系统稳定协作。",
    href: "/integrations",
    docsHref: "/docs/integrations/spreadjs",
    docsLabel: "查看 SpreadJS 集成",
  },
  {
    id: "plugins",
    title: "插件与扩展",
    shortTitle: "插件与扩展",
    description: "使用 Java 等技术扩展活字格服务端业务能力。",
    href: "/plugins",
    docsHref: "/docs/plugins",
    docsLabel: "开始 Java 插件开发",
  },
]

export function getSiteModule(id: SiteModule["id"]) {
  const module = siteModules.find((item) => item.id === id)

  if (!module) {
    throw new Error(`Unknown site module: ${id}`)
  }

  return module
}
