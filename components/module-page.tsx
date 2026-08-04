import { IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"
import type { ReactNode } from "react"

import type { SiteModule } from "@/lib/site-config"

export function ModulePage({
  module,
  children,
}: {
  module: SiteModule
  children: ReactNode
}) {
  return (
    <main className="flex-1">
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-12 lg:px-8 lg:py-20">
          <div className="lg:col-span-7">
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
              {module.title}
            </h1>
          </div>
          <div className="flex max-w-xl flex-col items-start gap-5 lg:col-span-5 lg:pt-1">
            <p className="text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              {module.description}
            </p>
            <Link
              href={module.docsHref}
              className="group inline-flex items-center gap-2 text-sm font-medium text-primary"
            >
              {module.docsLabel}
              <IconArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
        {children}
      </div>
    </main>
  )
}
