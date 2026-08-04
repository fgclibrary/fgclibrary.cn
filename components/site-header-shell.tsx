"use client"

import { type ReactNode, useEffect, useState } from "react"

export function SiteHeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 0)

    updateScrolled()
    window.addEventListener("scroll", updateScrolled, { passive: true })

    return () => window.removeEventListener("scroll", updateScrolled)
  }, [])

  return (
    <header
      data-scrolled={scrolled ? "" : undefined}
      className="sticky top-0 z-30 border-b border-transparent bg-background transition-colors duration-200 data-[scrolled]:border-border"
    >
      {children}
    </header>
  )
}
