import { createOpenAPI, type OpenAPIOptions } from "fumadocs-openapi/server"
import authOpenapiDocument from "@/auth-openapi.json"
import openapiDocument from "@/openapi.json"

const apiServerUrl = process.env.OPENAPI_SERVER_URL
const authServerUrl = process.env.AUTH_SERVER_URL

type SchemaRecord = Exclude<NonNullable<OpenAPIOptions["input"]>, string[]>
type ServerDocument = Exclude<SchemaRecord[string], string | (() => unknown)>

function resolveServers(
  document: ServerDocument,
  serverUrl?: string,
): ServerDocument {
  if (!serverUrl) {
    return document
  }

  return {
    ...document,
    servers: [{ url: serverUrl }],
  }
}

// 站点为纯静态导出，不提供试调代理（playground 已关闭），
// 因此无需配置 proxyUrl。
export const openapi = createOpenAPI({
  input: {
    default: resolveServers(openapiDocument as ServerDocument, apiServerUrl),
  },
})

export const tokenEndpoint = createOpenAPI({
  input: {
    default: resolveServers(
      authOpenapiDocument as ServerDocument,
      authServerUrl,
    ),
  },
})
