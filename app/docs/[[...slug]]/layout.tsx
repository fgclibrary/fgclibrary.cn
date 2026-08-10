import { DocsLayout } from "fumadocs-ui/layouts/docs"

import { baseOptions } from "@/lib/layout.shared"
import { getModuleNavigation } from "@/lib/source"

export default async function DocsSlugLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ slug?: string[] }>
}>) {
  const { slug } = await params
  const { tree, moduleName, moduleLandingUrl } = getModuleNavigation(slug)

  return (
    <DocsLayout
      tree={tree}
      tabs={false}
      {...baseOptions({
        includeLinks: false,
        moduleName,
        moduleUrl: moduleLandingUrl,
      })}
    >
      {children}
    </DocsLayout>
  )
}
