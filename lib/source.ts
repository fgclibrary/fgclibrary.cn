import { docs } from "collections/server"
import type { Folder, Item, Root } from "fumadocs-core/page-tree"
import { type InferPageType, loader } from "fumadocs-core/source"
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons"
import { openapiPlugin, openapiSource } from "fumadocs-openapi/server"
import { openapi, tokenEndpoint } from "@/lib/openapi"
import {
  getSolutionModuleByDocRoot,
  siteModules,
  solutionModules,
} from "@/lib/site-config"

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

type BuildNavigationInput = {
  tree: Root
  moduleNode: Folder
  docRoot: string
  landingHref?: string
}

function buildNavigation({
  tree,
  moduleNode,
  docRoot,
  landingHref,
}: BuildNavigationInput): ModuleNavigation {
  const moduleIndex: Item | undefined =
    moduleNode.index ??
    moduleNode.children.find(
      (node): node is Item =>
        node.type === "page" && node.url === `/docs/${docRoot}`,
    )
  const children = moduleNode.children
  const moduleName =
    siteModules.find((module) => module.id === docRoot)?.shortTitle ??
    solutionModules.find((module) => module.docRoot === docRoot)?.shortTitle ??
    moduleNode.name
  const moduleLandingUrl =
    siteModules.find((module) => module.id === docRoot)?.href ?? landingHref
  const unitFolders = children.filter(
    (node): node is Folder => node.type === "folder",
  )

  // 保留模块自身的完整层级（介绍页、同级页面与子文件夹），
  // 让侧边栏既能显示介绍页，也能展开子文件夹。此前仅摊平子文件夹，
  // 导致 rbac / offline-form 的介绍页与其它同级页面被丢弃。
  const navigationChildren = children

  return {
    tree: {
      ...tree,
      name: moduleName,
      description: moduleNode.description,
      children: navigationChildren,
    },
    moduleNode,
    moduleName,
    moduleUrl: moduleIndex?.url ?? `/docs/${docRoot}`,
    moduleLandingUrl,
    unitFolders,
  }
}

/** 在当前文件夹的 children 中，按完整路径（如 solutions/rbac）匹配子文件夹 */
function findFolderByDocRoot(
  root: Folder,
  docRoot: string,
): Folder | undefined {
  const stack: Folder[] = [root]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue

    if (current.$ref?.folder === docRoot) {
      return current
    }

    const nested = current.children.filter(
      (node): node is Folder => node.type === "folder",
    )
    stack.push(...nested)
  }

  return undefined
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

  // 解决方案因内容聚合，需要下钻到 rbac / offline-form 独立子树。
  // 优先按完整文档路径匹配解决方案子模块（如 solutions/rbac）。
  const solutionDocRoot = solutionModules.find(
    (module) =>
      slug?.join("/") === module.docRoot ||
      (slug[0] === "solutions" &&
        slug.slice(0, 2).join("/") === module.docRoot),
  )?.docRoot

  if (solutionDocRoot) {
    const solutionsNode = tree.children.find(
      (node): node is Folder =>
        node.type === "folder" &&
        (node.$ref?.folder === "solutions" ||
          node.index?.url === "/docs/solutions"),
    )

    if (solutionsNode) {
      const subNode = findFolderByDocRoot(solutionsNode, solutionDocRoot)

      if (subNode) {
        const solution = getSolutionModuleByDocRoot(solutionDocRoot)
        return buildNavigation({
          tree,
          moduleNode: subNode,
          docRoot: solutionDocRoot,
          landingHref: solution?.docsHref,
        })
      }
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

  return buildNavigation({ tree, moduleNode, docRoot: moduleSlug })
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
