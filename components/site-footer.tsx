import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch"

export function SiteFooter() {
  return (
    <footer>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <ThemeSwitch
          mode="light-dark-system"
          className="p-0.5 [&>button:nth-child(1)]:order-2 [&>button:nth-child(2)]:order-3 [&>button:nth-child(3)]:order-1"
        />
        <p className="text-sm text-muted-foreground">
          Copyright @ 2026 FgcLibrary Inc.
        </p>
      </div>
    </footer>
  )
}
