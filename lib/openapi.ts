import { createOpenAPI, type OpenAPIOptions } from "fumadocs-openapi/server"
import authOpenapiDocument from "@/auth-openapi.json"
import openapiDocument from "@/openapi.json"

// JSON 导入会把 `openapi` 字段推断为 string，而 OpenAPI 文档类型要求字面量，
// 因此这里做一次类型收窄。
type SchemaRecord = Exclude<NonNullable<OpenAPIOptions["input"]>, string[]>
type ServerDocument = Exclude<SchemaRecord[string], string | (() => unknown)>

// 纯静态站点：接口地址直接取自 OpenAPI 文档中的 `servers`
// （现为 `https://your-forguncy-site` 占位，供读者替换为自身站点）。
// 站点不提供试调代理，无需 proxyUrl；也不通过环境变量注入地址，
// 避免构建机上的本地地址被写入公开产物。
export const openapi = createOpenAPI({
  input: {
    default: openapiDocument as ServerDocument,
  },
})

export const tokenEndpoint = createOpenAPI({
  input: {
    default: authOpenapiDocument as ServerDocument,
  },
})
