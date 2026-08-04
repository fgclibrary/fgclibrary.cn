import { IconArrowRight } from "@tabler/icons-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ModulePage } from "@/components/module-page"
import { getSiteModule } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "解决方案",
  description: "浏览可以直接应用到活字格项目中的成熟、完整、可复用工程方案。",
}

const module = getSiteModule("solutions")

const capabilities = [
  "用户、角色与组织结构管理",
  "权限组与角色继承模型",
  "页面、组件和服务端命令",
  "完整 API 与自定义前端支持",
]

export default function SolutionsPage() {
  return (
    <ModulePage module={module}>
      <section className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="text-3xl font-semibold tracking-tight">
            RBAC 权限框架
          </h2>
          <p className="mt-5 text-pretty leading-7 text-muted-foreground">
            一套可以导入新应用的标准化权限管理工程，将活字格内置的用户、角色、组织和权限能力封装为可复用模块。
          </p>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <Link
              href="/docs/solutions/rbac/quick-start"
              className="group inline-flex items-center gap-2 font-medium text-primary"
            >
              快速开始
              <IconArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/docs/solutions/rbac"
              className="font-medium hover:underline"
            >
              了解框架设计
            </Link>
          </div>
        </div>

        <div className="border-t lg:col-span-6 lg:col-start-7">
          {capabilities.map((capability) => (
            <div key={capability} className="border-b py-4 text-sm">
              {capability}
            </div>
          ))}
        </div>
      </section>
    </ModulePage>
  )
}
