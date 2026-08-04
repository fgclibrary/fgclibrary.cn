import { IconArrowRight } from "@tabler/icons-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ModulePage } from "@/components/module-page"
import { getSiteModule } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "产品集成",
  description: "了解活字格与 SpreadJS 等产品、控件和外部系统的稳定集成方式。",
}

const module = getSiteModule("integrations")

export default function IntegrationsPage() {
  return (
    <ModulePage module={module}>
      <section className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="text-balance text-3xl font-semibold tracking-tight">
            活字格 × SpreadJS
          </h2>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <p className="text-pretty text-lg leading-8">
            在活字格中安全使用独立版本的 SpreadJS。
          </p>
          <p className="mt-4 text-pretty leading-7 text-muted-foreground">
            通过重命名全局命名空间和重新打包依赖，避免自定义 SpreadJS
            与活字格内置版本争用全局对象
            <code className="mx-1 font-mono text-sm text-foreground">GC</code>。
          </p>
          <Link
            href="/docs/integrations/spreadjs"
            className="group mt-7 inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            查看完整集成步骤
            <IconArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </ModulePage>
  )
}
