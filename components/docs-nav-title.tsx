"use client"

import { useDocsLayout } from "fumadocs-ui/layouts/docs"
import Link from "next/link"
import type { ComponentProps } from "react"

import { LogoIcon } from "@/components/icons"

export function DocsNavTitle({ className }: ComponentProps<"a">) {
  const {
    props: { nav },
  } = useDocsLayout()
  const moduleName = typeof nav?.title === "string" ? nav.title : undefined

  return (
    <div className={className}>
      <Link href="/" className="inline-flex items-center gap-2.5">
        <LogoIcon className="size-6" />
        <span className="font-medium">格言格语</span>
      </Link>
      {moduleName ? (
        <>
          <span className="text-fd-muted-foreground/60">/</span>
          <span className="max-w-32 truncate text-fd-muted-foreground">
            {moduleName}
          </span>
        </>
      ) : null}
    </div>
  )
}
