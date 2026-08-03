import { docs } from "collections/server"
import { type InferPageType, loader } from "fumadocs-core/source"
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons"
import { openapiPlugin, openapiSource } from "fumadocs-openapi/server"
import { openapi, tokenEndpoint } from "@/lib/openapi"

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
