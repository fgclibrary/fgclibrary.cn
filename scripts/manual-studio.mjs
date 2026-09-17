#!/usr/bin/env node
import { createHash } from "node:crypto"
import { readdirSync, statSync } from "node:fs"
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
const ASSET_DIR = path.join(WORK_DIR, "assets")
const PRESETS_FILE = path.join(WORK_DIR, "presets.json")

/** 站点索引缓存 60 秒，避免每点一次预览都重新读取。 */
const INDEX_TTL_MS = 60_000

/** 封面上传只收图片，且限制大小，避免误传大文件。 */
const UPLOAD_MIME = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
}
const UPLOAD_MAX_BYTES = 12 * 1024 * 1024
const UPLOAD_HINT = "仅支持 png/jpg/webp/gif/svg/avif"

/**
 * 按文件内容判断图片类型。
 *
 * 不依赖请求头里的 Content-Type：浏览器可能给空值，fetch 用 Blob/File 之外的
 * 方式发送时会变成 application/octet-stream，还有的客户端会写错。
 * 以魔数为准最可靠，Content-Type 只作为兜底。
 */
function detectImageType(buffer) {
  const ascii = (start, end) => buffer.subarray(start, end).toString("latin1")

  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mime: "image/png", extension: ".png" }
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mime: "image/jpeg", extension: ".jpg" }
  }
  if (buffer.length >= 6 && ascii(0, 6).startsWith("GIF8")) {
    return { mime: "image/gif", extension: ".gif" }
  }
  if (
    buffer.length >= 12 &&
    ascii(0, 4) === "RIFF" &&
    ascii(8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", extension: ".webp" }
  }
  if (buffer.length >= 12 && ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12)
    if (brand.startsWith("avif") || brand.startsWith("avis")) {
      return { mime: "image/avif", extension: ".avif" }
    }
  }

  // SVG 是文本，没有魔数，看开头是不是 svg 根元素。
  const head = buffer.subarray(0, 1024).toString("utf8").trimStart()
  if (
    head.startsWith("<svg") ||
    (head.startsWith("<?xml") && head.includes("<svg"))
  ) {
    return { mime: "image/svg+xml", extension: ".svg" }
  }

  return null
}

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
  await writeWorkDirReadme()
}

/**
 * 在工作目录里放一份说明。
 *
 * 这个目录容易被整体当成临时目录清掉，而保存的预设与上传的图片都在里面。
 * 写一份说明能避免误删，也方便日后接手的人知道哪些内容不能丢。
 */
async function writeWorkDirReadme() {
  const content = `# 手册工坊的工作目录

\`pnpm manual:studio\` 读写这里。**presets.json 与 assets/ 不要删除**，
它们是保存的预设组合与上传的封面图片。

- \`presets.json\`   预设组合（交付清单）。删除后需要重新配置。
- \`assets/\`        上传的封面图片，被预设引用。删除后预设会缺图。
- \`cache/\`         渲染结果缓存，随时可删，删了只是下次预览慢一点。

图片按内容哈希命名，同一张图重复上传不会产生副本。

要备份或换机器继续用，请在界面上点「导出」把预设存成一个自包含的
JSON（图片会内联进去），在另一台机器上「导入」即可完整恢复。

整个目录都在 .gitignore 里，不会进入版本库。
`

  try {
    await writeFile(path.join(WORK_DIR, "README.md"), content, "utf8")
  } catch {
    // 说明文件写失败不影响使用。
  }
}

/**
 * 把预设里引用的本地图片转成 data URL，供导出。
 * 非本地引用（网址、已是 data URL、空值）原样返回 null 表示不需要处理。
 */
async function inlineAsset(reference) {
  const value = typeof reference === "string" ? reference.trim() : ""
  if (!value || /^(https?:|data:)/i.test(value)) {
    return null
  }

  const filePath = path.resolve(value)
  // 只内联工作目录里的素材，避免把项目里其它文件（如站点素材）
  // 也打进备份文件。
  const relative = path.relative(ASSET_DIR, filePath)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null
  }

  try {
    const buffer = await readFile(filePath)
    const mime = MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()]
    return mime ? `data:${mime};base64,${buffer.toString("base64")}` : null
  } catch {
    return null
  }
}

/**
 * 把导入文件里的 data URL 还原成 assets 目录下的文件（内容寻址）。
 * 返回相对项目根目录的路径；非 data URL 的引用原样保留。
 */
async function restoreAsset(reference) {
  const value = typeof reference === "string" ? reference.trim() : ""
  if (!value) {
    return null
  }

  const match = /^data:([^;,]+);base64,(.*)$/s.exec(value)
  if (!match) {
    // 网址或普通路径：导入后继续按原样使用。
    return value
  }

  const [, mime, payload] = match
  const extension = UPLOAD_MIME[mime]
  if (!extension) {
    return null
  }

  const buffer = Buffer.from(payload, "base64")
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16)
  const stored = `${hash}${extension}`
  const storedPath = path.join(ASSET_DIR, stored)

  await mkdir(ASSET_DIR, { recursive: true })
  try {
    await writeFile(storedPath, buffer, { flag: "wx" })
  } catch (error) {
    if (error?.code !== "EEXIST") {
      throw error
    }
  }

  return path.relative(process.cwd(), storedPath)
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

/**
 * 决定 PDF 长什么样的两个来源：渲染代码与文档内容。
 * 它们一变，缓存就必须失效，否则改了封面样式或文档文案后，
 * 预览仍会返回上一次的旧 PDF（缓存只比对渲染参数，看不到这些变化）。
 */
const RENDER_VERSION_SOURCES = [
  path.join(import.meta.dirname, "lib", "manual-core.mjs"),
  path.resolve("content/docs"),
]

/** 取文件或目录树下最新的修改时间；取不到返回 0。 */
function newestMtime(target) {
  let stat
  try {
    stat = statSync(target)
  } catch {
    return 0
  }

  // 目录本身的时间也算上：删除文件时只有目录时间会变。
  let newest = stat.mtimeMs
  if (!stat.isDirectory()) {
    return newest
  }

  for (const entry of readdirSync(target, { withFileTypes: true })) {
    newest = Math.max(newest, newestMtime(path.join(target, entry.name)))
  }
  return newest
}

/** 渲染代码 + 文档内容的版本指纹。 */
function computeRenderVersion() {
  const stamps = RENDER_VERSION_SOURCES.map(
    (target) => `${path.basename(target)}:${newestMtime(target)}`,
  )
  return createHash("sha256")
    .update(stamps.join("|"))
    .digest("hex")
    .slice(0, 12)
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
    cover: config.cover ?? null,
    renderVersion: computeRenderVersion(),
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
    job.pages = config.slugs.length
    job.pdfPath = cachedPath
    // 带上篇数与体积，让缓存命中的提示与首次渲染一致。
    emit(job, {
      type: "done",
      cached: true,
      title: job.title,
      chapters: config.slugs.length,
      size: cached.length,
    })
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
          cover: config.cover,
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

/** 按扩展名回图片类型，用于读取已上传的封面素材。 */
const MIME_BY_EXTENSION = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
}

/** 预设里会引用图片的字段，导出/导入时按这些字段处理。 */
const COVER_IMAGE_FIELDS = ["background", "logo"]

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

/** 读取二进制请求体，并在超过上限时立刻中断，避免把内存吃满。 */
async function readBinaryBody(request, maxBytes) {
  const chunks = []
  let size = 0

  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBytes) {
      request.destroy()
      throw new Error(`文件超过上限 ${Math.round(maxBytes / 1024 / 1024)}MB`)
    }
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
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

  if (request.method === "POST" && url.pathname === "/api/upload") {
    try {
      const buffer = await readBinaryBody(request, UPLOAD_MAX_BYTES)
      if (buffer.length === 0) {
        sendJson(response, 400, { error: "文件内容为空" })
        return
      }

      // 优先按文件内容判断；Content-Type 只作兜底（可能为空、为
      // application/octet-stream，或与内容不符）。
      const contentType = (request.headers["content-type"] ?? "")
        .split(";")[0]
        .trim()
      const detected =
        detectImageType(buffer) ??
        (UPLOAD_MIME[contentType]
          ? { mime: contentType, extension: UPLOAD_MIME[contentType] }
          : null)

      if (!detected) {
        sendJson(response, 400, {
          error:
            `无法识别的图片格式（${contentType || "未声明类型"}）。` +
            `请确认文件确实是图片；${UPLOAD_HINT}。`,
        })
        return
      }

      // 内容寻址：文件名由内容哈希决定。
      // 同一张图重复上传不会产生副本，预设引用的名字也稳定，
      // 不会像时间戳命名那样越存越多。
      const hash = createHash("sha256")
        .update(buffer)
        .digest("hex")
        .slice(0, 16)
      const stored = `${hash}${detected.extension}`
      const storedPath = path.join(ASSET_DIR, stored)

      await mkdir(ASSET_DIR, { recursive: true })
      let deduped = true
      try {
        await writeFile(storedPath, buffer, { flag: "wx" })
        deduped = false
      } catch (error) {
        // 已存在同内容的文件，直接复用，不再写一遍。
        if (error?.code !== "EEXIST") {
          throw error
        }
      }

      // 回传相对项目根目录的路径，服务端解析封面图片时会读这个文件。
      sendJson(response, 200, {
        path: path.relative(process.cwd(), storedPath),
        asset: stored,
        bytes: buffer.length,
        deduped,
      })
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return
  }

  // 读取已上传的图片，供界面显示缩略图。
  const assetMatch = /^\/api\/assets\/([A-Za-z0-9._-]+)$/.exec(url.pathname)
  if (request.method === "GET" && assetMatch) {
    // 只允许访问 assets 目录下的单层文件名，杜绝路径穿越。
    const name = assetMatch[1]
    if (name.includes("..") || path.basename(name) !== name) {
      sendJson(response, 400, { error: "非法的资源名" })
      return
    }

    try {
      const buffer = await readFile(path.join(ASSET_DIR, name))
      response.writeHead(200, {
        "Content-Type":
          MIME_BY_EXTENSION[path.extname(name).toLowerCase()] ??
          "application/octet-stream",
        "Content-Length": buffer.length,
        "Cache-Control": "no-store",
      })
      response.end(buffer)
    } catch {
      sendJson(response, 404, { error: "资源不存在" })
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

  // 预设导出：把引用的本地图片内联成 data URL，生成一个自包含的备份文件。
  // 换机器或清空工作目录后，导入这个文件即可完整恢复。
  if (request.method === "GET" && url.pathname === "/api/presets/export") {
    try {
      const presets = await readPresets()
      const exported = await Promise.all(
        presets.map(async (preset) => {
          const cover = { ...(preset.cover ?? {}) }
          for (const field of COVER_IMAGE_FIELDS) {
            const inline = await inlineAsset(cover[field])
            if (inline !== null) {
              cover[field] = inline
            }
          }
          return { ...preset, cover }
        }),
      )

      const bundle = {
        kind: "manual-studio-presets",
        version: 1,
        exportedAt: new Date().toISOString(),
        presets: exported,
      }
      const body = JSON.stringify(bundle, null, 2)
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          `手册预设-${new Date().toISOString().slice(0, 10)}.json`,
        )}`,
      })
      response.end(body)
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return
  }

  // 预设导入：把内联的 data URL 还原成 assets 目录下的文件，
  // 再把引用改回路径，于是导入后就能直接用来渲染。
  if (request.method === "POST" && url.pathname === "/api/presets/import") {
    try {
      const body = await readJsonBody(request)
      const incoming = Array.isArray(body.presets)
        ? body.presets
        : Array.isArray(body.bundle?.presets)
          ? body.bundle.presets
          : null

      if (!incoming) {
        sendJson(response, 400, {
          error: "文件格式不正确：未找到 presets 数组",
        })
        return
      }

      const restored = []
      for (const preset of incoming) {
        if (!preset || typeof preset.name !== "string" || !preset.name.trim()) {
          continue
        }
        const cover = { ...(preset.cover ?? {}) }
        for (const field of COVER_IMAGE_FIELDS) {
          const stored = await restoreAsset(cover[field])
          if (stored !== null) {
            cover[field] = stored
          }
        }
        restored.push({
          name: preset.name.trim(),
          slugs: Array.isArray(preset.slugs)
            ? preset.slugs.filter((slug) => typeof slug === "string")
            : [],
          title: String(preset.title ?? ""),
          subtitle: String(preset.subtitle ?? ""),
          toc: preset.toc !== false,
          siteUrl: String(preset.siteUrl ?? ""),
          cover,
        })
      }

      if (restored.length === 0) {
        sendJson(response, 400, { error: "文件里没有可导入的预设" })
        return
      }

      // 同名预设以导入的为准，其余保留。
      const existing = await readPresets()
      const byName = new Map(existing.map((item) => [item.name, item]))
      for (const preset of restored) {
        byName.set(preset.name, preset)
      }
      const merged = [...byName.values()]
      await writePresets(merged)

      sendJson(response, 200, { presets: merged, imported: restored.length })
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return
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

    const coverInput = body.cover ?? {}
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
      cover: {
        version: String(coverInput.version ?? "").trim(),
        note: String(coverInput.note ?? "").trim(),
        // showLogo 用布尔传递：空 logo 字段表示“用默认标识”，
        // 而不是“不要 logo”，两者必须能区分开。
        showLogo: coverInput.showLogo !== false,
        logo: String(coverInput.logo ?? "").trim(),
        logoWidth: String(coverInput.logoWidth ?? "").trim(),
        background: String(coverInput.background ?? "").trim(),
        backgroundOpacity: String(coverInput.backgroundOpacity ?? "").trim(),
        theme: ["light", "dark", "auto"].includes(coverInput.theme)
          ? coverInput.theme
          : "auto",
        fontSize: {
          title: String(coverInput.fontSize?.title ?? "").trim(),
          subtitle: String(coverInput.fontSize?.subtitle ?? "").trim(),
          meta: String(coverInput.fontSize?.meta ?? "").trim(),
        },
        position: {
          logo: String(coverInput.position?.logo ?? "").trim(),
          title: String(coverInput.position?.title ?? "").trim(),
          meta: String(coverInput.position?.meta ?? "").trim(),
        },
      },
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
