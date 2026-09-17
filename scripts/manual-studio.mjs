#!/usr/bin/env node
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
/**
 * 手册工坊：导出 PDF 手册的本地界面。
 *
 * 用法：
 *   pnpm manual:studio            # 打开 http://127.0.0.1:4173
 *   pnpm manual:studio -- --port 5000 --open
 *
 * 设计要点：
 *   - 只在本机运行，不部署到线上站点；站点是纯静态导出，运行时没有 Node，
 *     而生成 PDF 需要驱动浏览器，所以这一层必须留在本地。
 *   - 不引入任何新依赖：HTTP 服务用 node:http，PDF 渲染复用 manual-core。
 *   - 不修改站点代码与样式，只读取运行中的站点。
 *
 * 前置条件：本地站点已启动（pnpm dev）。
 */
import { createServer } from "node:http"
import path from "node:path"
import process from "node:process"
import {
  buildTree,
  createRenderer,
  DEFAULT_BASE_URL,
  deriveTitle,
  loadSiteIndex,
  resolveChaptersBySlugs,
} from "./lib/manual-core.mjs"

const STUDIO_DIR = path.join(import.meta.dirname, "studio")
const WORK_DIR = path.resolve(".manual-studio")
const CACHE_DIR = path.join(WORK_DIR, "cache")
const PRESETS_FILE = path.join(WORK_DIR, "presets.json")

/** 站点索引缓存 60 秒，避免每点一次预览都重新读取。 */
const INDEX_TTL_MS = 60_000

function parseArgs(argv) {
  const options = {
    port: 4173,
    host: "127.0.0.1",
    baseUrl: DEFAULT_BASE_URL,
    open: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => argv[++i]
    if (arg === "--port" || arg === "-p") {
      options.port = Number(next())
    } else if (arg === "--host") {
      options.host = next()
    } else if (arg === "--base-url") {
      options.baseUrl = next()
    } else if (arg === "--open") {
      options.open = true
    } else if (arg === "-h" || arg === "--help") {
      process.stdout.write(
        `手册工坊（本地导出界面）\n\n` +
          `用法：node scripts/manual-studio.mjs [选项]\n\n` +
          `选项：\n` +
          `  -p, --port <端口>      监听端口（默认 4173）\n` +
          `      --host <地址>      监听地址（默认 127.0.0.1）\n` +
          `      --base-url <地址>  站点地址（默认 ${DEFAULT_BASE_URL}）\n` +
          `      --open             启动后自动打开浏览器\n`,
      )
      process.exit(0)
    }
  }

  options.baseUrl = options.baseUrl.replace(/\/+$/, "")
  return options
}

/* ---------------------------------------------------------------- 站点索引 */

let indexCache = null

async function getSiteIndex(baseUrl, { refresh = false } = {}) {
  const now = Date.now()
  if (
    !refresh &&
    indexCache?.baseUrl === baseUrl &&
    now - indexCache.at < INDEX_TTL_MS
  ) {
    return indexCache.nodes
  }

  const nodes = await loadSiteIndex(baseUrl)
  indexCache = { baseUrl, nodes, at: now }
  return nodes
}

/* ------------------------------------------------------------------ 预设 */

async function readPresets() {
  try {
    const text = await readFile(PRESETS_FILE, "utf8")
    const parsed = JSON.parse(text)
    return Array.isArray(parsed.presets) ? parsed.presets : []
  } catch {
    // 文件不存在或损坏时按空处理，不影响使用。
    return []
  }
}

async function writePresets(presets) {
  await mkdir(WORK_DIR, { recursive: true })
  await writeFile(PRESETS_FILE, JSON.stringify({ presets }, null, 2), "utf8")
}

/* ------------------------------------------------------------------ 任务 */

const jobs = new Map()
let jobSeq = 0

/** 渲染串行执行：同一时间只跑一个，避免多个 Chromium 页面互相抢资源。 */
let queue = Promise.resolve()

function emit(job, payload) {
  job.events.push(payload)
  for (const listener of job.listeners) {
    listener(payload)
  }
}

function configHash(config) {
  const normalized = {
    baseUrl: config.baseUrl,
    slugs: config.slugs,
    title: config.title,
    subtitle: config.subtitle,
    date: config.date,
    toc: config.toc,
    siteUrl: config.siteUrl,
  }
  return createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex")
    .slice(0, 16)
}

async function createJob(config) {
  const hash = configHash(config)
  const cachedPath = path.join(CACHE_DIR, `${hash}.pdf`)

  const job = {
    id: `job-${++jobSeq}`,
    hash,
    status: "pending",
    progress: null,
    error: null,
    title: config.title,
    pages: null,
    size: null,
    pdfPath: cachedPath,
    events: [],
    listeners: [],
  }
  jobs.set(job.id, job)

  // 已经渲染过完全相同的组合，直接复用产物。
  try {
    const cached = await readFile(cachedPath)
    job.status = "done"
    job.size = cached.length
    job.pdfPath = cachedPath
    emit(job, { type: "done", cached: true, title: job.title })
    return job
  } catch {
    // 未命中缓存，走真实渲染。
  }

  queue = queue.then(async () => {
    job.status = "running"
    emit(job, { type: "start", total: config.slugs.length })

    try {
      const nodes = await getSiteIndex(config.baseUrl)
      const chapters = resolveChaptersBySlugs(nodes, config.slugs)

      const title = config.title || deriveTitle(chapters)
      job.title = title

      const buffer = await renderer.render(
        {
          baseUrl: config.baseUrl,
          chapters,
          title,
          subtitle: config.subtitle,
          date: config.date,
          toc: config.toc,
          siteUrl: config.siteUrl,
        },
        (progress) => {
          job.progress = progress
          emit(job, { type: "progress", ...progress })
        },
      )

      await mkdir(CACHE_DIR, { recursive: true })
      await writeFile(cachedPath, buffer)

      job.status = "done"
      job.size = buffer.length
      job.pages = chapters.length
      emit(job, {
        type: "done",
        title,
        chapters: chapters.length,
        size: buffer.length,
      })
    } catch (error) {
      job.status = "error"
      job.error = error instanceof Error ? error.message : String(error)
      emit(job, { type: "error", message: job.error })
    }
  })

  return job
}

const renderer = createRenderer()

/* ------------------------------------------------------------------ HTTP */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  })
  response.end(body)
}

async function readJsonBody(request) {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(chunk)
  }
  if (chunks.length === 0) {
    return {}
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

/** 只允许读取 studio 目录下的固定几个文件，避免任意路径读取。 */
const STATIC_FILES = new Set(["index.html", "studio.css", "studio.js"])

async function serveStatic(response, fileName) {
  if (!STATIC_FILES.has(fileName)) {
    response.writeHead(404).end("Not found")
    return
  }

  try {
    const content = await readFile(path.join(STUDIO_DIR, fileName))
    response.writeHead(200, {
      "Content-Type":
        MIME[path.extname(fileName)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    })
    response.end(content)
  } catch {
    response.writeHead(404).end("Not found")
  }
}

function streamJobEvents(request, response, job) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  })

  const send = (payload) => {
    response.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  // 补齐已发生的事件，避免界面连上来之前的事件丢失。
  for (const event of job.events) {
    send(event)
  }

  if (job.status === "done" || job.status === "error") {
    response.end()
    return
  }

  const listener = (payload) => {
    send(payload)
    if (payload.type === "done" || payload.type === "error") {
      cleanup()
      response.end()
    }
  }
  const cleanup = () => {
    job.listeners = job.listeners.filter((item) => item !== listener)
    request.off("close", cleanup)
  }

  job.listeners.push(listener)
  request.on("close", cleanup)
}

async function servePdf(response, job, { download }) {
  let buffer
  try {
    buffer = await readFile(job.pdfPath)
  } catch {
    sendJson(response, 404, { error: "PDF 尚未生成" })
    return
  }

  const name = `${job.title || "文档手册"}.pdf`
  const headers = {
    "Content-Type": "application/pdf",
    "Content-Length": buffer.length,
  }

  if (download) {
    headers["Content-Disposition"] =
      `attachment; filename*=UTF-8''${encodeURIComponent(name)}`
  } else {
    headers["Content-Disposition"] =
      `inline; filename*=UTF-8''${encodeURIComponent(name)}`
  }

  response.writeHead(200, headers)
  response.end(buffer)
}

async function handle(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`)

  if (
    request.method === "GET" &&
    (url.pathname === "/" || url.pathname === "/index.html")
  ) {
    await serveStatic(response, "index.html")
    return
  }

  if (request.method === "GET" && STATIC_FILES.has(url.pathname.slice(1))) {
    await serveStatic(response, url.pathname.slice(1))
    return
  }

  if (request.method === "GET" && url.pathname === "/favicon.ico") {
    // 界面不提供图标，直接回 204，避免控制台出现无谓的 404。
    response.writeHead(204).end()
    return
  }

  if (request.method === "GET" && url.pathname === "/api/docs") {
    const baseUrl = (
      url.searchParams.get("baseUrl") || options.baseUrl
    ).replace(/\/+$/, "")
    try {
      const nodes = await getSiteIndex(baseUrl, {
        refresh: url.searchParams.get("refresh") === "1",
      })
      const tree = buildTree(nodes)
      const pages = nodes
        .filter((node) => node.kind === "page")
        .map((node) => ({
          title: node.title,
          description: node.description ?? "",
          url: node.url,
          depth: node.depth,
        }))
      sendJson(response, 200, { baseUrl, tree, pages, count: pages.length })
    } catch (error) {
      sendJson(response, 502, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return
  }

  if (url.pathname === "/api/presets") {
    if (request.method === "GET") {
      sendJson(response, 200, { presets: await readPresets() })
      return
    }
    if (request.method === "PUT") {
      try {
        const body = await readJsonBody(request)
        const presets = Array.isArray(body.presets) ? body.presets : []
        await writePresets(presets)
        sendJson(response, 200, { presets })
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
      return
    }
  }

  if (request.method === "POST" && url.pathname === "/api/render") {
    let body
    try {
      body = await readJsonBody(request)
    } catch {
      sendJson(response, 400, { error: "请求体不是合法 JSON" })
      return
    }

    // 注意保留空字符串：文档首页 /docs 的 slug 就是 ""，用 filter(Boolean)
    // 会把用户勾选的这一篇静默丢掉。
    const slugs = Array.isArray(body.slugs)
      ? body.slugs.filter((slug) => typeof slug === "string")
      : []
    if (slugs.length === 0) {
      sendJson(response, 400, { error: "请至少选择一篇文档" })
      return
    }

    const job = await createJob({
      baseUrl: (body.baseUrl || options.baseUrl).replace(/\/+$/, ""),
      slugs,
      title: String(body.title ?? "").trim(),
      subtitle: String(body.subtitle ?? "").trim(),
      date:
        String(body.date ?? "").trim() || new Date().toISOString().slice(0, 10),
      toc: body.toc !== false,
      siteUrl: String(body.siteUrl ?? "")
        .trim()
        .replace(/\/+$/, ""),
    })

    sendJson(response, 200, { jobId: job.id, status: job.status })
    return
  }

  const eventsMatch = /^\/api\/render\/([^/]+)\/events$/.exec(url.pathname)
  if (request.method === "GET" && eventsMatch) {
    const job = jobs.get(eventsMatch[1])
    if (!job) {
      sendJson(response, 404, { error: "任务不存在" })
      return
    }
    streamJobEvents(request, response, job)
    return
  }

  const pdfMatch = /^\/api\/render\/([^/]+)\/pdf$/.exec(url.pathname)
  if (request.method === "GET" && pdfMatch) {
    const job = jobs.get(pdfMatch[1])
    if (!job) {
      sendJson(response, 404, { error: "任务不存在" })
      return
    }
    if (job.status !== "done") {
      sendJson(response, 409, { error: "PDF 尚未生成完成" })
      return
    }
    await servePdf(response, job, {
      download: url.searchParams.get("download") === "1",
    })
    return
  }

  response.writeHead(404).end("Not found")
}

const options = parseArgs(process.argv.slice(2))

createServer((request, response) => {
  handle(request, response).catch((error) => {
    process.stderr.write(`请求处理失败：${error}\n`)
    if (!response.headersSent) {
      sendJson(response, 500, { error: String(error) })
    } else {
      response.end()
    }
  })
}).listen(options.port, options.host, async () => {
  const url = `http://${options.host}:${options.port}`
  process.stdout.write(`手册工坊已启动：${url}\n`)
  process.stdout.write(`站点地址：${options.baseUrl}\n`)
  process.stdout.write(`产物缓存：${CACHE_DIR}\n`)

  try {
    const check = await fetch(`${options.baseUrl}/llms.txt`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!check.ok) {
      process.stdout.write(
        `\n提示：站点返回 HTTP ${check.status}，请确认 pnpm dev 已启动。\n`,
      )
    }
  } catch {
    process.stdout.write(
      `\n提示：无法连接站点 ${options.baseUrl}，请先运行 pnpm dev。\n`,
    )
  }

  if (options.open) {
    const { spawn } = await import("node:child_process")
    spawn("open", [url], { stdio: "ignore", detached: true }).unref()
  }
})

async function shutdown() {
  await renderer.close()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
