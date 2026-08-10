import { IconArrowRight, IconCheck } from "@tabler/icons-react"
import type { Metadata } from "next"
import Link from "next/link"

import { SiteAnnouncement } from "@/components/site-announcement"
import { getSiteModule } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "插件与扩展",
  description: "使用 Java 等技术开发活字格插件，扩展服务端业务能力。",
}

const module = getSiteModule("plugins")

const plugins = [
  {
    title: "Java 服务端插件",
    description:
      "利用活字格内置 JRE 和 Java 生态封装服务端业务逻辑，适合连接已有 Java 技术体系。",
    capabilities: [
      "JDK、JRE 版本与开发环境准备",
      "Maven 项目模板与活字格插件 SDK",
      "服务端命令插件与业务逻辑开发",
      "插件编译、部署与运行时边界",
    ],
    links: [
      { href: "/docs/plugins", label: "阅读开发说明", primary: true },
      { href: "/docs/plugins/java-dependence", label: "配置环境依赖" },
    ],
  },
]

export default function PluginsPage() {
  return (
    <main className="flex-1">
      <section>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <SiteAnnouncement />
            <h1 className="text-balance text-4xl font-semibold leading-[1.15] tracking-[-0.035em] sm:text-5xl">
              活字格插件与扩展
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
              使用 Java 等技术扩展活字格服务端能力，让应用连接已有技术体系。
            </p>
            <Link
              href={module.docsHref}
              className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary"
            >
              浏览插件开发文档
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
            选择适合项目的扩展方式
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            从开发环境到服务端运行，按完整路径了解活字格插件的适用边界和落地方式。
          </p>
        </div>

        <div className="mt-10 grid gap-6">
          {plugins.map((plugin) => (
            <article
              key={plugin.title}
              className="overflow-hidden rounded-xl border bg-background"
            >
              <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)] lg:gap-12">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {plugin.title}
                  </h3>
                  <p className="mt-4 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
                    {plugin.description}
                  </p>
                  <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                    {plugin.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={
                          link.primary
                            ? "group inline-flex items-center gap-2 font-medium text-primary"
                            : "font-medium hover:underline"
                        }
                      >
                        {link.label}
                        {link.primary ? (
                          <IconArrowRight
                            aria-hidden="true"
                            className="size-4 transition-transform group-hover:translate-x-1"
                          />
                        ) : null}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  <p className="text-xs font-medium tracking-[0.14em] text-primary">
                    包含能力
                  </p>
                  <ul className="mt-4 grid gap-3">
                    {plugin.capabilities.map((capability) => (
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
