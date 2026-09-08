import { IconChevronDown } from "@tabler/icons-react"
import Link from "next/link"

import { LogoIcon } from "@/components/icons"
import { MobileNav } from "@/components/mobile-nav"
import { SiteHeaderShell } from "@/components/site-header-shell"
import { SiteSearchTrigger } from "@/components/site-search-trigger"
import { Button } from "@/components/ui/button"
import { siteModules, solutionModules } from "@/lib/site-config"

export function SiteHeader() {
  return (
    <SiteHeaderShell>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6 md:gap-1 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight"
        >
          <LogoIcon className="size-7" />
          <span>格言格语</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <SiteSearchTrigger />
        </div>

        <nav
          aria-label="主导航"
          className="hidden min-w-0 items-center gap-1 md:flex"
        >
          {siteModules.map((module) =>
            module.id === "solutions" ? (
              <div key={module.id} className="group relative">
                <Button
                  variant="ghost"
                  size="lg"
                  nativeButton={false}
                  render={<Link href={module.href} />}
                  className="gap-1"
                >
                  {module.shortTitle}
                  <IconChevronDown
                    aria-hidden="true"
                    className="size-3.5 transition-transform group-hover:rotate-180"
                  />
                </Button>
                <div className="invisible absolute top-full left-0 z-40 min-w-56 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
                  <div className="rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg">
                    {solutionModules.map((solution) => (
                      <Link
                        key={solution.id}
                        href={solution.docsHref}
                        className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <span className="block text-sm font-medium">
                          {solution.shortTitle}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {solution.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Button
                key={module.id}
                variant="ghost"
                size="lg"
                nativeButton={false}
                render={<Link href={module.href} />}
              >
                {module.shortTitle}
              </Button>
            ),
          )}
        </nav>

        <MobileNav />
      </div>
    </SiteHeaderShell>
  )
}
