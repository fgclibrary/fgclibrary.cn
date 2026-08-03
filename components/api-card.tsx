import Link from "fumadocs-core/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const methodColors: Record<string, string> = {
  GET: "text-green-600 dark:text-green-400",
  POST: "text-blue-600 dark:text-blue-400",
  PUT: "text-yellow-600 dark:text-yellow-400",
  PATCH: "text-orange-600 dark:text-orange-400",
  DELETE: "text-red-600 dark:text-red-400",
}

type APICardProps = {
  children?: ReactNode
  className?: string
  description?: string
  href: string
  method?: string
  title: string
  webhook?: boolean
}

export function APICard({
  href,
  title,
  description,
  method,
  webhook,
  className,
  children,
}: APICardProps) {
  return (
    <Link
      className={cn(
        "@max-lg:col-span-full block rounded-xl border bg-fd-card p-4 text-fd-card-foreground transition-colors",
        "hover:bg-fd-accent/80",
        className,
      )}
      data-card
      href={href}
    >
      <div className="flex items-center gap-2">
        <h3 className="not-prose font-medium text-sm">{title}</h3>
        {method ? (
          <span
            className={cn(
              "text-nowrap font-medium font-mono text-xs",
              methodColors[method.toUpperCase()] ?? methodColors.GET,
            )}
          >
            {method.toUpperCase()}
          </span>
        ) : null}
        {webhook ? (
          <span className="text-nowrap rounded-lg border border-current px-1 font-mono text-xs">
            Webhook
          </span>
        ) : null}
      </div>

      {description ? (
        <div className="mt-1 text-fd-muted-foreground text-sm">
          {description}
        </div>
      ) : null}

      {children ? (
        <div className="prose-no-margin text-fd-muted-foreground text-sm empty:hidden">
          {children}
        </div>
      ) : null}
    </Link>
  )
}
