import Link from "next/link"

import { LogoIcon } from "@/components/icons"
import { MobileNav } from "@/components/mobile-nav"
import { SiteHeaderShell } from "@/components/site-header-shell"
import { SiteSearchTrigger } from "@/components/site-search-trigger"
import { Button } from "@/components/ui/button"
import { siteModules } from "@/lib/site-config"

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
          {siteModules.map((module) => (
            <Button
              key={module.id}
              variant="ghost"
              size="lg"
              nativeButton={false}
              render={<Link href={module.href} />}
            >
              {module.shortTitle}
            </Button>
          ))}
        </nav>

        <MobileNav />
      </div>
    </SiteHeaderShell>
  )
}
