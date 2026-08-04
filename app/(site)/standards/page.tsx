import { IconArrowUpRight } from "@tabler/icons-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ModulePage } from "@/components/module-page"
import { getSiteModule } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "标准化",
  description: "覆盖架构、开发和运维阶段的活字格标准化最佳实践与工程经验。",
}

const module = getSiteModule("standards")

const areas = [
  {
    title: "架构",
    description: "理解系统形态、生命周期、部署方式与健壮性设计。",
    href: "/docs/standards/arch",
  },
  {
    title: "开发",
    description: "统一命名、数据库、扩展、协同和配置管理方式。",
    href: "/docs/standards/dev",
  },
  {
    title: "UI 与页面设计",
    description: "建立一致、清晰并且易于长期维护的应用界面。",
    href: "/docs/standards/dev/base/page-design",
  },
  {
    title: "运维",
    description: "关注系统、服务和数据在生产环境中的持续稳定运行。",
    href: "/docs/standards/operation",
  },
]

export default function StandardsPage() {
  return (
    <ModulePage module={module}>
      <section className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            贯穿项目生命周期
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            标准化内容保持原有完整结构。你可以通读，也可以从当前项目最需要改善的阶段开始。
          </p>
        </div>

        <div className="border-t lg:col-span-8">
          {areas.map((area) => (
            <Link
              key={area.title}
              href={area.href}
              className="group grid gap-2 border-b py-5 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-center"
            >
              <h3 className="font-medium">{area.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {area.description}
              </p>
              <IconArrowUpRight
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </Link>
          ))}
        </div>
      </section>
    </ModulePage>
  )
}
