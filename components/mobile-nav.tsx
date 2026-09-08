"use client"

import { IconMenu2, IconX } from "@tabler/icons-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { siteModules, solutionModules } from "@/lib/site-config"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog modal={false} open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
      >
        {open ? (
          <IconX data-icon="inline-start" />
        ) : (
          <IconMenu2 data-icon="inline-start" />
        )}
        <span className="sr-only">{open ? "关闭主导航" : "打开主导航"}</span>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        showOverlay={false}
        className="top-16 left-0 h-[calc(100dvh-4rem)] w-screen max-w-none translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none p-6 ring-0 sm:max-w-none md:hidden data-open:zoom-in-100 data-closed:zoom-out-100"
      >
        <DialogTitle className="sr-only">主导航</DialogTitle>

        <nav aria-label="移动端主导航" className="flex flex-col gap-1">
          {siteModules.map((module) =>
            module.id === "solutions" ? (
              <div key={module.id} className="px-3 py-1">
                <Link
                  href={module.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-lg font-medium transition-colors hover:bg-muted"
                >
                  {module.shortTitle}
                </Link>
                <div className="mt-1 flex flex-col">
                  {solutionModules.map((solution) => (
                    <Link
                      key={solution.id}
                      href={solution.docsHref}
                      onClick={() => setOpen(false)}
                      className="ml-3 rounded-lg border-l pl-4 pr-3 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {solution.shortTitle}
                      <span className="mt-0.5 block text-xs font-normal">
                        {solution.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={module.id}
                href={module.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-lg font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {module.shortTitle}
              </Link>
            ),
          )}
        </nav>
      </DialogContent>
    </Dialog>
  )
}
