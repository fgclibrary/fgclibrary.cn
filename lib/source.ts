import { docs } from "collections/server"
import type { Folder, Item, Root } from "fumadocs-core/page-tree"
import { type InferPageType, loader } from "fumadocs-core/source"
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons"
import { openapiPlugin, openapiSource } from "fumadocs-openapi/server"
import { openapi, tokenEndpoint } from "@/lib/openapi"
import { siteModules } from "@/lib/site-config"

export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: await openapiSource(openapi, {
      baseDir: "solutions/rbac/api/(generated)",
      meta: {
        folderStyle: "folder",
      },
      groupBy: "tag",
    }),
    "auth-api": await openapiSource(tokenEndpoint, {
      baseDir: "solutions/rbac/api/auth",
      meta: {
        folderStyle: "separator",
      },
    }),
  },
  {
    baseUrl: "/docs",
    plugins: [lucideIconsPlugin(), openapiPlugin()],
  },
)

type ModuleNavigation = {
  tree: Root
  moduleNode?: Folder
  moduleName?: React.ReactNode
  moduleUrl?: string
  moduleLandingUrl?: string
  unitFolders: Folder[]
}

export function getModuleNavigation(slug?: string[]): ModuleNavigation {
  const tree = source.getPageTree()
  const moduleSlug = slug?.[0]

  if (!moduleSlug) {
    return {
      tree,
      moduleNode: undefined,
      moduleName: undefined,
      moduleUrl: undefined,
      moduleLandingUrl: undefined,
      unitFolders: [],
    }
  }

  const moduleNode = tree.children.find(
    (node): node is Folder =>
      node.type === "folder" &&
      (node.$ref?.folder === moduleSlug ||
        node.index?.url === `/docs/${moduleSlug}`),
  )

  if (!moduleNode) {
    return {
      tree,
      moduleNode: undefined,
      moduleName: undefined,
      moduleUrl: undefined,
      moduleLandingUrl: undefined,
      unitFolders: [],
    }
  }

  const moduleIndex: Item | undefined =
    moduleNode.index ??
    moduleNode.children.find(
      (node): node is Item =>
        node.type === "page" && node.url === `/docs/${moduleSlug}`,
    )
  const children = moduleNode.children.filter((node) => node !== moduleIndex)
  const moduleName =
    siteModules.find((module) => module.id === moduleSlug)?.shortTitle ??
    moduleNode.name
  const moduleLandingUrl = siteModules.find(
    (module) => module.id === moduleSlug,
  )?.href
  const unitFolders = children.filter(
    (node): node is Folder => node.type === "folder",
  )
  const promotedChildren = unitFolders.flatMap((folder) => [
    ...(folder.index ? [folder.index] : []),
    ...folder.children,
  ])
  const navigationChildren =
    unitFolders.length > 0 ? promotedChildren : children

  return {
    tree: {
      ...tree,
      name: moduleName,
      description: moduleNode.description,
      children: navigationChildren,
    },
    moduleNode,
    moduleName,
    moduleUrl: moduleIndex?.url ?? `/docs/${moduleSlug}`,
    moduleLandingUrl,
    unitFolders,
  }
}

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "image.png"]

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  }
}

export function getPageMarkdownUrl(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "content.md"]

  return {
    segments,
    url: `/${["llms.mdx", "docs", ...segments].join("/")}`,
  }
}

export async function getLLMText(page: InferPageType<typeof source>) {
  if (page.type === "openapi" || page.type === "auth-api") {
    return JSON.stringify(page.data.getSchema().bundled, null, 2)
  }

  const processed = await page.data.getText("processed")

  return `# ${page.data.title} (${page.url})

${processed}`
}
