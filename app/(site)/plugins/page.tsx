import { IconArrowRight } from "@tabler/icons-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ModulePage } from "@/components/module-page"
import { getSiteModule } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "插件与扩展",
  description: "使用 Java 等技术开发活字格插件，扩展服务端业务能力。",
}

const module = getSiteModule("plugins")

export default function PluginsPage() {
  return (
    <ModulePage module={module}>
      <section className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="text-3xl font-semibold tracking-tight">
            Java 服务端插件
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            利用活字格内置 JRE 和 Java 生态封装服务端业务逻辑，适合连接已有 Java
            技术体系。
          </p>
        </div>

        <div className="border-t lg:col-span-6 lg:col-start-7">
          <div className="border-b py-5">
            <h3 className="font-medium">从环境准备到服务端逻辑开发</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              了解 JDK 与 Maven 环境要求、活字格 JRE 版本约束，以及 Java
              插件当前适用的服务端开发边界。
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 pt-6 text-sm">
            <Link
              href="/docs/plugins"
              className="group inline-flex items-center gap-2 font-medium text-primary"
            >
              阅读开发说明
              <IconArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/docs/plugins/java-dependence"
              className="font-medium hover:underline"
            >
              配置环境依赖
            </Link>
          </div>
        </div>
      </section>
    </ModulePage>
  )
}
