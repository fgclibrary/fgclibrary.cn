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

export const openapi = createOpenAPI({
  input: {
    default: resolveServers(openapiDocument as ServerDocument, apiServerUrl),
  },
  proxyUrl: "/api/proxy",
})

export const tokenEndpoint = createOpenAPI({
  input: {
    default: resolveServers(
      authOpenapiDocument as ServerDocument,
      authServerUrl,
    ),
  },
  proxyUrl: "/api/proxy",
})
