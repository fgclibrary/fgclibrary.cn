import { IconArrowRight, IconCheck } from "@tabler/icons-react"
import type { Metadata } from "next"
import Link from "next/link"

import { SiteAnnouncement } from "@/components/site-announcement"
import { getSiteModule } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "产品集成",
  description: "了解活字格与 SpreadJS 等产品、控件和外部系统的稳定集成方式。",
}

const module = getSiteModule("integrations")

const integrations = [
  {
    title: "活字格 × SpreadJS",
    description:
      "在活字格中安全使用独立版本的 SpreadJS，扩展前端电子表格能力，同时避免与平台内置依赖发生冲突。",
    capabilities: [
      "SpreadJS 依赖版本与作用域隔离",
      "重新定义全局命名空间，避免 GC 冲突",
      "按需重新打包 SpreadJS 组件",
      "在应用中引入自定义 JavaScript 与 CSS",
    ],
    link: {
      href: "/docs/integrations/spreadjs",
      label: "查看完整集成步骤",
    },
  },
]

export default function IntegrationsPage() {
  return (
    <main className="flex-1">
      <section>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <SiteAnnouncement />
            <h1 className="text-balance text-4xl font-semibold leading-[1.15] tracking-[-0.035em] sm:text-5xl">
              活字格产品集成
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
              让活字格与产品、控件和外部系统稳定协作，把成熟能力接入你的应用。
            </p>
            <Link
              href={module.docsHref}
              className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary"
            >
              浏览产品集成文档
              <IconArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="max-w-2xl">
          <h2 className="text-balance text-2xl font-semibold tracking-tight">
            选择适合项目的集成方案
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            从依赖隔离到应用接入，按步骤把外部产品能力安全地带进活字格项目。
          </p>
        </div>

        <div className="mt-10 grid gap-6">
          {integrations.map((integration) => (
            <article
              key={integration.title}
              className="overflow-hidden rounded-xl border bg-background"
            >
              <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)] lg:gap-12">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {integration.title}
                  </h3>
                  <p className="mt-4 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
                    {integration.description}
                  </p>
                  <Link
                    href={integration.link.href}
                    className="group mt-7 inline-flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    {integration.link.label}
                    <IconArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </div>

                <div className="border-t pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  <p className="text-xs font-medium tracking-[0.14em] text-primary">
                    包含能力
                  </p>
                  <ul className="mt-4 grid gap-3">
                    {integration.capabilities.map((capability) => (
                      <li
                        key={capability}
                        className="flex items-start gap-2 text-sm leading-6"
                      >
                        <IconCheck
                          aria-hidden="true"
                          className="mt-1 size-4 shrink-0 text-muted-foreground"
                        />
                        <span>{capability}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
