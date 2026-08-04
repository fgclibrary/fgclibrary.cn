import { IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { siteAnnouncement } from "@/lib/site-config"

export function SiteAnnouncement() {
  if (!siteAnnouncement.enabled) return null

  return (
    <Badge
      className="mb-6"
      render={<Link href={siteAnnouncement.href} />}
      variant="soft"
    >
      {siteAnnouncement.label}
      <IconArrowRight aria-hidden="true" data-icon="inline-end" />
    </Badge>
  )
}
