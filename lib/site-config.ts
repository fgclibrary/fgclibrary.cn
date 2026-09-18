export type SiteModule = {
  id: "levels" | "solutions" | "standards" | "integrations" | "plugins"
  title: string
  shortTitle: string
  description: string
  href: string
  docsHref: string
  docsLabel: string
}

export type SiteSolutionModule = {
  id: "rbac" | "hac" | "offline-form"
  title: string
  shortTitle: string
  /** 文档侧边栏用于匹配的目录段，如 solutions/rbac */
  docRoot: string
  description: string
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
  label: "HAC 离线填报已上线",
  href: "/docs/solutions/offline-form",
}

export const siteModules: SiteModule[] = [
  {
    id: "levels",
    title: "能力地图",
    shortTitle: "能力地图",
    description: "定位当前能力阶段，找到从入门到企业级交付的下一步。",
    href: "/levels",
    docsHref: "/docs/levels/l1",
    docsLabel: "查看 L1–L4 能力清单",
  },
  {
    id: "solutions",
    title: "解决方案",
    shortTitle: "解决方案",
    description: "把经过验证的应用能力直接带进新的活字格项目。",
    href: "/solutions",
    docsHref: "/docs/solutions",
    docsLabel: "浏览解决方案文档",
  },
  {
    id: "standards",
    title: "标准化",
    shortTitle: "标准化",
    description: "将架构、开发与运维经验沉淀为可执行的项目建议。",
    href: "/standards",
    docsHref: "/docs/standards/arch",
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
    docsHref: "/docs/plugins/java",
    docsLabel: "开始 Java 插件开发",
  },
]

/** 解决方案分组下的独立子模块，主导航与落地页共用 */
export const solutionModules: SiteSolutionModule[] = [
  {
    id: "rbac",
    title: "RBAC 权限框架",
    shortTitle: "RBAC",
    docRoot: "solutions/rbac",
    description:
      "将用户、角色、组织与权限能力封装为可复用模块，为新应用提供一套清晰、可靠的权限基础。",
    docsHref: "/docs/solutions/rbac",
    docsLabel: "浏览 RBAC 文档",
  },
  {
    id: "hac",
    title: "HAC",
    shortTitle: "HAC",
    docRoot: "solutions/hac",
    description:
      "把活字格应用运行在 Android 手机、平板和工业 PDA 上，通过插件命令调用扫码、定位、拍摄、NFC、BLE 等设备能力，并按现场原则设计移动页面。",
    docsHref: "/docs/solutions/hac",
    docsLabel: "浏览 HAC 文档",
  },
  {
    id: "offline-form",
    title: "HAC 离线填报",
    shortTitle: "离线填报",
    docRoot: "solutions/offline-form",
    description:
      "让现场作业人员断网也能继续完成表单填报，恢复网络后把填报记录与附件安全回传到活字格。",
    docsHref: "/docs/solutions/offline-form",
    docsLabel: "浏览离线填报文档",
  },
]

export function getSiteModule(id: SiteModule["id"]) {
  const module = siteModules.find((item) => item.id === id)

  if (!module) {
    throw new Error(`Unknown site module: ${id}`)
  }

  return module
}

/** 根据文档路径首段（如 solutions/rbac）匹配解决方案子模块 */
export function getSolutionModuleByDocRoot(docRoot: string) {
  return solutionModules.find((module) => module.docRoot === docRoot)
}
