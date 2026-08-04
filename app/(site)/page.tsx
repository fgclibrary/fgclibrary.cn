import { IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"

import { SiteAnnouncement } from "@/components/site-announcement"
import { type SiteModule, siteModules } from "@/lib/site-config"
import { cn } from "@/lib/utils"

function ModuleCard({
  module,
  featured = false,
}: {
  module: SiteModule
  featured?: boolean
}) {
  return (
    <Link
      href={module.href}
      className={cn(
        "group flex h-full min-h-32 flex-col items-start gap-3 bg-background p-6 text-left transition-colors hover:bg-muted/50 sm:p-7",
        featured && "items-center justify-center md:p-10",
      )}
    >
      <div className={cn("flex flex-col gap-3", featured && "w-full max-w-md")}>
        <span
          className={cn(
            "inline-flex items-center gap-2 font-medium",
            featured && "md:text-2xl md:leading-tight",
          )}
        >
          {module.shortTitle}
          <IconArrowRight
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground"
          />
        </span>
        <span
          className={cn(
            "max-w-xl text-sm leading-6 text-muted-foreground",
            featured && "md:text-base md:leading-7",
          )}
        >
          {module.description}
        </span>
      </div>
    </Link>
  )
}

export default function HomePage() {
  return (
    <main className="flex-1">
      <section>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <SiteAnnouncement />
            <h1 className="text-balance text-4xl font-semibold leading-[1.15] tracking-[-0.035em] sm:text-5xl">
              活字格开发资源库
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
              汇集活字格开发中的能力路径、工程规范、成熟方案与产品集成经验。
            </p>
            <Link
              href="/levels"
              className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary"
            >
              从能力地图开始
              <IconArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="text-left">
          <h2 className="text-balance text-2xl font-semibold tracking-tight">
            找到适合你的活字格开发内容
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            从能力学习到项目交付，再到产品集成，选择与你当前目标匹配的入口。
          </p>

          <div className="mt-10 w-full">
            <div className="grid gap-px border bg-border md:grid-cols-2">
              <div className="md:row-span-2">
                <ModuleCard featured module={siteModules[0]} />
              </div>
              <div className="grid gap-px bg-border sm:grid-cols-2 md:row-span-2">
                {siteModules.slice(1).map((module) => (
                  <ModuleCard key={module.id} module={module} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
