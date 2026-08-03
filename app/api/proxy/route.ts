import { openapi } from "@/lib/openapi"

const configuredOrigins =
  process.env.PROXY_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []

const proxy = openapi.createProxy({
  allowedOrigins: configuredOrigins,
})

async function handle(request: Request): Promise<Response> {
  const response = await proxy.handle(request)
  const headers = new Headers(response.headers)
  headers.delete("content-encoding")
  headers.delete("content-length")

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export {
  handle as DELETE,
  handle as GET,
  handle as PATCH,
  handle as POST,
  handle as PUT,
}
