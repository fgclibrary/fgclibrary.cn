"use client"

import { Dialog } from "@base-ui/react/dialog"
import { useTranslations } from "@fuma-translate/react"
import { IconSearch } from "@tabler/icons-react"
import { useSearchContext } from "fumadocs-ui/contexts/search"

import { cn } from "@/lib/utils"

export function SiteSearchTrigger() {
  const { enabled, dialogHandle } = useSearchContext()
  const t = useTranslations({ note: "search trigger" })

  if (!enabled) return null

  return (
    <Dialog.Trigger
      handle={dialogHandle}
      type="button"
      data-search=""
      aria-label={t("Open Search", { note: "aria-label" })}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        "md:h-8 md:w-32 md:justify-between md:gap-3 md:rounded-full md:border-border md:bg-background md:pl-4 md:pr-1 lg:w-40",
      )}
    >
      <span className="hidden min-w-0 flex-1 truncate text-left md:inline">
        搜索
      </span>
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground md:size-6">
        <IconSearch aria-hidden="true" className="size-4" />
      </span>
    </Dialog.Trigger>
  )
}
